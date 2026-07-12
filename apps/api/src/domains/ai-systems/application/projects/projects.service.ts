import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import type { CreateAiSystemCommand } from './project.commands';
import { Prisma, Project } from '@prisma/client';
import { EmailService } from '../../../../platform/email/email.service';
import { NotificationsService } from '../../../notifications/application/notifications.service';
import { WorkflowQueryService } from '../../../review-approval/application/workflow-query.service';
import { SubmitProjectForReviewUseCase } from '../../../review-approval/application/submit-project-for-review.use-case';
import { StartProjectReviewUseCase } from '../../../review-approval/application/start-project-review.use-case';
import { RequestProjectChangesUseCase } from '../../../review-approval/application/request-project-changes.use-case';
import { ResubmitProjectUseCase } from '../../../review-approval/application/resubmit-project.use-case';
import { ApproveProjectUseCase } from '../../../review-approval/application/approve-project.use-case';
import { ProjectWorkflowStatus } from '../../../review-approval/domain/workflow-status';
import type {
  ProjectAccessOptions,
  ProjectAccessRole,
} from '../../domain/access/project-access.types';
import type { ProjectLifecycleStatus } from '../../domain/lifecycle/project-lifecycle.types';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
    private readonly workflowQueries: WorkflowQueryService,
    private readonly submitProjectForReview: SubmitProjectForReviewUseCase,
    private readonly startProjectReview: StartProjectReviewUseCase,
    private readonly requestProjectChanges: RequestProjectChangesUseCase,
    private readonly resubmitProject: ResubmitProjectUseCase,
    private readonly approveProject: ApproveProjectUseCase,
  ) {}

  // Shared includes for full project retrieval
  private readonly projectDetailInclude: any = {
    reviewer: { select: { id: true, email: true, role: true } },
    approver: { select: { id: true, email: true, role: true } },
    sections: {
      include: {
        lastEditor: { select: { id: true, email: true } },
        comments: {
          include: { author: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusEvents: {
          include: { actor: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        artifacts: {
          include: {
            uploadedBy: { select: { id: true, email: true } },
            reviewedBy: { select: { id: true, email: true } },
            previousArtifact: {
              select: {
                id: true,
                version: true,
                checksum: true,
                citationKey: true,
              },
            },
          },
          orderBy: { version: 'desc' },
        } as any,
      },
    },
    documents: true,
    statusEvents: {
      include: { actor: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    },
    owner: { select: { id: true, email: true } },
  };

  private async applyLegacyProjectStatusTransition(params: {
    projectId: string;
    actorId: string;
    status: string;
    note?: string;
    signature?: string;
  }) {
    const workflow = await this.workflowQueries.getProjectWorkflow(
      params.projectId,
      params.actorId,
    );

    if (params.status === 'DRAFT') {
      if (workflow.workflowStatus !== ProjectWorkflowStatus.READY_FOR_REVIEW) {
        throw new BadRequestException(
          'Only submitted projects can be moved back to draft',
        );
      }
      await (this.prisma as any).project.update({
        where: { id: params.projectId },
        data: {
          status: 'DRAFT',
          workflowStatus: 'DRAFT',
          workflowVersion: { increment: 1 },
        },
      });
      await (this.prisma as any).projectStatusEvent.create({
        data: {
          projectId: params.projectId,
          status: 'DRAFT',
          note: `[workflow:DRAFT]${params.note ? ` ${params.note}` : ''}`,
          signature: params.signature?.trim(),
          actorId: params.actorId,
        },
      });
      return;
    }

    if (params.status === 'IN_REVIEW') {
      if (workflow.workflowStatus === ProjectWorkflowStatus.DRAFT) {
        await this.submitProjectForReview.execute({
          projectId: params.projectId,
          actorId: params.actorId,
          expectedVersion: workflow.workflowVersion,
          note: params.note,
        });
        const refreshed = await this.workflowQueries.getProjectWorkflow(
          params.projectId,
          params.actorId,
        );
        await this.startProjectReview.execute({
          projectId: params.projectId,
          actorId:
            refreshed.reviewerId && refreshed.reviewerId !== params.actorId
              ? refreshed.reviewerId
              : params.actorId,
          expectedVersion: refreshed.workflowVersion,
          note: params.note,
        });
        return;
      }
      if (workflow.workflowStatus === ProjectWorkflowStatus.CHANGES_REQUESTED) {
        await this.resubmitProject.execute({
          projectId: params.projectId,
          actorId: params.actorId,
          expectedVersion: workflow.workflowVersion,
          note: params.note,
        });
        const refreshed = await this.workflowQueries.getProjectWorkflow(
          params.projectId,
          params.actorId,
        );
        await this.startProjectReview.execute({
          projectId: params.projectId,
          actorId:
            refreshed.reviewerId && refreshed.reviewerId !== params.actorId
              ? refreshed.reviewerId
              : params.actorId,
          expectedVersion: refreshed.workflowVersion,
          note: params.note,
        });
        return;
      }
      await this.startProjectReview.execute({
        projectId: params.projectId,
        actorId: params.actorId,
        expectedVersion: workflow.workflowVersion,
        note: params.note,
      });
      return;
    }

    if (params.status === 'CHANGES_REQUESTED') {
      await this.requestProjectChanges.execute({
        projectId: params.projectId,
        actorId: params.actorId,
        expectedVersion: workflow.workflowVersion,
        note: params.note ?? '',
      });
      return;
    }

    if (params.status === 'APPROVED') {
      await this.approveProject.execute({
        projectId: params.projectId,
        actorId: params.actorId,
        expectedVersion: workflow.workflowVersion,
        note: params.note,
        signature: params.signature,
      });
      return;
    }

    throw new BadRequestException(
      `Unsupported project status transition: ${params.status}`,
    );
  }

  private async resolveAccess(
    projectId: string,
    userId: string,
    companyId?: string,
    opts?: ProjectAccessOptions,
  ): Promise<{
    project: Project;
    accessRole: ProjectAccessRole;
    membershipRole?: string | null;
  }> {
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (companyId && project.companyId && project.companyId !== companyId) {
      throw new ForbiddenException('Project belongs to a different workspace');
    }
    const membership = project.companyId
      ? await this.prisma.userCompany.findUnique({
          where: { userId_companyId: { userId, companyId: project.companyId } },
        })
      : null;
    const accessRole =
      project.ownerId === userId
        ? 'OWNER'
        : project.reviewerId === userId
          ? 'REVIEWER'
          : project.approverId === userId
            ? 'APPROVER'
            : null;
    const allowOwner = opts?.allowOwner ?? true;
    const allowReviewer = opts?.allowReviewer ?? false;
    const allowApprover = opts?.allowApprover ?? false;
    const allowCompanyMember = opts?.allowCompanyMember ?? false;

    if (accessRole === 'OWNER' && allowOwner) {
      if (project.companyId && !membership && companyId) {
        throw new ForbiddenException('Not a member of the workspace');
      }
      return { project, accessRole, membershipRole: membership?.role ?? null };
    }
    if (!membership || (companyId && membership.companyId !== companyId)) {
      throw new ForbiddenException('Not a member of the workspace');
    }
    if (allowCompanyMember) {
      return {
        project,
        accessRole: accessRole ?? 'MEMBER',
        membershipRole: membership.role,
      };
    }
    if (accessRole === 'REVIEWER' && allowReviewer) {
      return { project, accessRole, membershipRole: membership.role };
    }
    if (accessRole === 'APPROVER' && allowApprover) {
      return { project, accessRole, membershipRole: membership.role };
    }
    throw new ForbiddenException();
  }

  async listForUser(userId: string, companyId: string) {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    const projects = await this.prisma.project.findMany({
      where: {
        companyId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sections: {
          select: { id: true, name: true, updatedAt: true },
        },
        documents: {
          select: { id: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return projects.map((project: any) => ({
      ...project,
      viewerRole:
        project.ownerId === userId
          ? 'OWNER'
          : project.reviewerId === userId
            ? 'REVIEWER'
            : project.approverId === userId
              ? 'APPROVER'
              : 'MEMBER',
    }));
  }

  async createForUser(
    userId: string,
    companyId: string,
    dto: CreateAiSystemCommand,
  ) {
    return (this.prisma as any).project.create({
      data: {
        ...dto,
        ownerId: userId,
        companyId,
      } as any,
    });
  }

  async getOwnedProject(projectId: string, userId: string, companyId?: string) {
    await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: false,
      allowApprover: false,
    });
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: this.projectDetailInclude,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return { ...project, viewerRole: 'OWNER' };
  }

  async getProjectForUser(
    projectId: string,
    userId: string,
    companyId?: string,
  ) {
    const access = await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: this.projectDetailInclude,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return { ...project, viewerRole: access.accessRole };
  }

  async assertOwnership(
    projectId: string,
    userId: string,
    companyId?: string,
  ): Promise<Project> {
    const { project } = await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: false,
      allowApprover: false,
    });
    return project;
  }

  async assertAccess(
    projectId: string,
    userId: string,
    companyId?: string,
    opts?: ProjectAccessOptions,
  ) {
    return this.resolveAccess(projectId, userId, companyId, opts);
  }

  async cloneProject(
    projectId: string,
    userId: string,
    companyId: string,
    name?: string,
  ) {
    const source = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { sections: true },
    });
    if (!source) {
      throw new NotFoundException('Project not found');
    }
    if (source.ownerId !== userId || source.companyId !== companyId) {
      throw new ForbiddenException();
    }
    const cloneName = name?.trim() || `${source.name} Copy`;
    const newProject = await this.prisma.$transaction(async (tx) => {
      const created = await (tx as any).project.create({
        data: {
          name: cloneName,
          industry: source.industry,
          riskLevel: source.riskLevel,
          ownerId: userId,
          companyId,
        },
      });
      if (source.sections.length) {
        await (tx as any).section.createMany({
          data: source.sections.map((section) => ({
            name: section.name,
            content: section.content as Prisma.InputJsonValue,
            projectId: created.id,
          })),
        });
      }
      return created;
    });
    return this.getOwnedProject(newProject.id, userId);
  }

  async updateStatus(
    projectId: string,
    userId: string,
    companyId: string,
    status: ProjectLifecycleStatus,
    note?: string,
    signature?: string,
  ) {
    await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
    });
    await this.applyLegacyProjectStatusTransition({
      projectId,
      actorId: userId,
      status,
      note,
      signature,
    });
    return this.getProjectForUser(projectId, userId, companyId);
  }

  async listReviewers(projectId: string, userId: string, companyId: string) {
    const project = await this.assertOwnership(projectId, userId, companyId);
    if (!project.companyId) {
      throw new NotFoundException('Project company not set');
    }
    const memberships = await this.prisma.userCompany.findMany({
      where: {
        companyId: project.companyId,
        role: { in: ['REVIEWER', 'ADMIN'] as any },
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });
    if (!memberships.length) {
      const selfMembership = await this.prisma.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId: project.companyId } },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
      if (selfMembership) {
        return [
          {
            id: selfMembership.user.id,
            email: selfMembership.user.email,
            role: selfMembership.role,
          },
        ];
      }
    }
    return memberships
      .map((entry) => ({
        id: entry.user.id,
        email: entry.user.email,
        role: entry.role,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }

  async requestReview(
    projectId: string,
    userId: string,
    companyId: string,
    reviewerId: string,
    message?: string,
    approverId?: string,
  ) {
    const access = await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: false,
      allowApprover: false,
    });
    const workspaceId = access.project.companyId ?? companyId;
    const reviewerMembership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId: reviewerId, companyId: workspaceId },
      },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!reviewerMembership) {
      throw new ForbiddenException('Reviewer not part of this workspace');
    }
    if (
      reviewerMembership.role !== 'REVIEWER' &&
      reviewerMembership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('Target user is not a reviewer');
    }

    let approver: { id: string; email: string } | null = null;
    if (approverId) {
      const apMembership = await this.prisma.userCompany.findUnique({
        where: {
          userId_companyId: { userId: approverId, companyId: workspaceId },
        },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
      if (!apMembership) {
        throw new ForbiddenException('Approver not part of this workspace');
      }
      if (apMembership.role !== 'REVIEWER' && apMembership.role !== 'ADMIN') {
        throw new ForbiddenException('Target approver is not a reviewer');
      }
      approver = { id: apMembership.user.id, email: apMembership.user.email };
    }

    const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/projects/${projectId}?companyId=${workspaceId}`;
    const subject = `Review request: ${access.project.name}`;
    const body = [
      `You have been requested to review the project "${access.project.name}".`,
      message?.trim() ? `\nMessage: ${message.trim()}` : '',
      `\nOpen project: ${link}`,
    ]
      .filter(Boolean)
      .join('\n');

    const workflow = await this.workflowQueries.getProjectWorkflow(
      projectId,
      userId,
    );
    const workflowNote = `Requested review from ${reviewerMembership.user.email}${
      approver ? `; approver ${approver.email}` : ''
    }${message?.trim() ? ` — ${message.trim()}` : ''}`;
    await this.submitProjectForReview.execute({
      projectId,
      actorId: userId,
      expectedVersion: workflow.workflowVersion,
      reviewerId: reviewerMembership.user.id,
      approverId: approver?.id,
      note: workflowNote,
    });
    const submitted = await this.workflowQueries.getProjectWorkflow(
      projectId,
      userId,
    );
    await this.startProjectReview.execute({
      projectId,
      actorId: reviewerMembership.user.id,
      expectedVersion: submitted.workflowVersion,
      note: 'Legacy request-review endpoint auto-started review',
    });

    await this.emailService.sendReminder(
      reviewerMembership.user.email,
      subject,
      body,
    );
    if (approver) {
      const asub = `FYI: ${access.project.name} sent for review`;
      const abody = [
        `You were set as approver for "${access.project.name}".`,
        `\nLink: ${link}`,
      ]
        .filter(Boolean)
        .join('\n');
      await this.emailService.sendReminder(approver.email, asub, abody);
      await this.notifications.create({
        userId: approver.id,
        title: `Approver set: ${access.project.name}`,
        body: 'You were added as approver and will be notified when ready.',
        type: 'approval',
        meta: { projectId, companyId: workspaceId },
      });
    }
    return { ok: true };
  }
}
