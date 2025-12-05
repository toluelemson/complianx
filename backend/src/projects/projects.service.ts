import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Prisma, Project } from '@prisma/client';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
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
        artifacts: ({
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
        } as any),
      },
    },
    documents: true,
    statusEvents: {
      include: { actor: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    },
    owner: { select: { id: true, email: true } },
  };

  private async resolveAccess(
    projectId: string,
    userId: string,
    companyId?: string,
    opts?: {
      allowReviewer?: boolean;
      allowApprover?: boolean;
      allowOwner?: boolean;
      allowCompanyMember?: boolean;
    },
  ): Promise<{
    project: Project;
    accessRole: 'OWNER' | 'REVIEWER' | 'APPROVER' | 'MEMBER';
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
      return { project, accessRole: accessRole ?? 'MEMBER', membershipRole: membership.role };
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

  async createForUser(userId: string, companyId: string, dto: CreateProjectDto) {
    return (this.prisma as any).project.create({
      data: ({
        ...dto,
        ownerId: userId,
        companyId,
      } as any),
    });
  }

  async getOwnedProject(
    projectId: string,
    userId: string,
    companyId?: string,
  ) {
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
    opts?: {
      allowReviewer?: boolean;
      allowApprover?: boolean;
      allowOwner?: boolean;
      allowCompanyMember?: boolean;
    },
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
    status: string,
    note?: string,
    signature?: string,
  ) {
    const actor = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (!actor) {
      throw new NotFoundException('User not found');
    }
    const access = await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
    });
    const workspaceId = access.project.companyId ?? companyId;
    const currentStatus = access.project.status;
    const membershipRole = access.membershipRole ?? actor.role;
    const isReviewerRole =
      access.accessRole === 'APPROVER' ||
      membershipRole === 'REVIEWER' ||
      membershipRole === 'ADMIN';
    const isAssigned =
      access.accessRole === 'REVIEWER' || access.accessRole === 'APPROVER';

    if (status === 'APPROVED') {
      if (!isAssigned && access.accessRole !== 'OWNER') {
        throw new ForbiddenException('Only assigned reviewers can approve');
      }
      if (!isReviewerRole) {
        throw new ForbiddenException('Reviewer role required to approve');
      }
      if (!signature?.trim()) {
        throw new BadRequestException('Signature is required to approve');
      }
    }
    if (status === 'CHANGES_REQUESTED' && !isAssigned && access.accessRole !== 'OWNER') {
      throw new ForbiddenException('Only assigned reviewers can request changes');
    }
    if (status === 'APPROVED') {
      if (currentStatus === 'DRAFT') {
        throw new BadRequestException('Send for review before approving');
      }
      if (currentStatus === 'CHANGES_REQUESTED') {
        throw new BadRequestException('Owner must resubmit after changes before approval');
      }
    }
    if (status === 'CHANGES_REQUESTED' && currentStatus === 'DRAFT') {
      throw new BadRequestException('Send for review before requesting changes');
    }

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).project.update({
        where: { id: projectId },
        data: { status: status as any },
      });
      await (tx as any).projectStatusEvent.create({
        data: ({
          projectId,
          status: status as any,
          note,
          signature: signature?.trim(),
          actorId: userId,
        } as any),
      });
    });

    // Notify owner about reviewer decisions
    if (
      (status === 'APPROVED' || status === 'CHANGES_REQUESTED') &&
      access.project.ownerId !== userId
    ) {
      const owner = await this.prisma.user.findUnique({
        where: { id: access.project.ownerId },
        select: { id: true, email: true },
      });
      if (owner) {
        const title =
          status === 'APPROVED'
            ? `Project approved: ${access.project.name}`
            : `Changes requested: ${access.project.name}`;
        const bodyText =
          status === 'APPROVED'
            ? 'A reviewer approved your project.'
            : note?.trim() || 'A reviewer requested changes.';
        await this.notifications.create({
          userId: owner.id,
          title,
          body: bodyText,
          type: 'review',
          meta: { projectId, companyId: workspaceId },
        });
      }
    }

    return this.getProjectForUser(projectId, userId, companyId);
  }

  async listReviewers(
    projectId: string,
    userId: string,
    companyId: string,
  ) {
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
      where: { userId_companyId: { userId: reviewerId, companyId: workspaceId } },
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
        where: { userId_companyId: { userId: approverId, companyId: workspaceId } },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
      if (!apMembership) {
        throw new ForbiddenException('Approver not part of this workspace');
      }
      if (
        apMembership.role !== 'REVIEWER' &&
        apMembership.role !== 'ADMIN'
      ) {
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

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: ({
          status: 'IN_REVIEW',
          reviewerId: reviewerMembership.user.id,
          approverId: approver?.id ?? undefined,
          companyId: workspaceId,
        } as any),
      });
      await tx.projectStatusEvent.create({
        data: {
          projectId,
          status: 'IN_REVIEW',
          note: `Requested review from ${reviewerMembership.user.email}${approver ? `; approver ${approver.email}` : ''}${
            message?.trim() ? ` — ${message.trim()}` : ''
          }`,
          actorId: userId,
        },
      });
    });

    await this.emailService.sendReminder(
      reviewerMembership.user.email,
      subject,
      body,
    );
    await this.notifications.create({
      userId: reviewerMembership.user.id,
      title: `Review requested: ${access.project.name}`,
      body: message?.trim() || 'A project requires your review.',
      type: 'review',
      meta: { projectId, companyId: workspaceId },
    });

    if (approver) {
      const asub = `FYI: ${access.project.name} sent for review`;
      const abody = [`You were set as approver for "${access.project.name}".`, `\nLink: ${link}`]
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
