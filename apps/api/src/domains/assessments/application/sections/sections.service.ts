import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import {
  CreateSectionCommand,
  CreateSectionCommentCommand,
  SuggestSectionCommand,
  UpdateSectionCommand,
  UpdateSectionStatusCommand,
} from './section.commands';
import { LlmService } from '../../../../platform/ai/llm.service';
import { EmailService } from '../../../../platform/email/email.service';
import { NotificationsService } from '../../../notifications/application/notifications.service';
import { MonetizationService } from '../../../subscriptions/application/monetization.service';
import { WorkflowQueryService } from '../../../review-approval/application/workflow-query.service';
import { CompleteSectionUseCase } from '../../../review-approval/application/complete-section.use-case';
import { SubmitSectionForReviewUseCase } from '../../../review-approval/application/submit-section-for-review.use-case';
import { RequestSectionChangesUseCase } from '../../../review-approval/application/request-section-changes.use-case';
import { ApproveSectionUseCase } from '../../../review-approval/application/approve-section.use-case';
import { ReopenProjectAfterSectionEditUseCase } from '../../../review-approval/application/reopen-project-after-section-edit.use-case';
import { SectionWorkflowStatus } from '../../../review-approval/domain/workflow-status';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
    private readonly monetization: MonetizationService,
    private readonly workflowQueries: WorkflowQueryService,
    private readonly completeSectionUseCase: CompleteSectionUseCase,
    private readonly submitSectionForReviewUseCase: SubmitSectionForReviewUseCase,
    private readonly requestSectionChangesUseCase: RequestSectionChangesUseCase,
    private readonly approveSectionUseCase: ApproveSectionUseCase,
    private readonly reopenProjectAfterSectionEditUseCase: ReopenProjectAfterSectionEditUseCase,
  ) {}

  private async applyLegacySectionStatusTransition(params: {
    sectionId: string;
    actorId: string;
    status: string;
    note?: string;
    signature?: string;
  }) {
    const workflow = await this.workflowQueries.getSectionWorkflow(
      params.sectionId,
      params.actorId,
    );

    if (params.status === 'DRAFT') {
      await (this.prisma as any).section.update({
        where: { id: params.sectionId },
        data: {
          status: 'DRAFT',
          workflowStatus: 'DRAFT',
        },
      });
      await (this.prisma as any).sectionStatusEvent.create({
        data: {
          sectionId: params.sectionId,
          status: 'DRAFT',
          note: `[workflow:DRAFT]${params.note ? ` ${params.note}` : ''}`,
          signature: params.signature?.trim(),
          actorId: params.actorId,
        },
      });
      return;
    }

    if (params.status === 'IN_REVIEW') {
      if (
        workflow.workflowStatus === SectionWorkflowStatus.DRAFT ||
        workflow.workflowStatus === SectionWorkflowStatus.CHANGES_REQUESTED
      ) {
        await this.completeSectionUseCase.execute({
          sectionId: params.sectionId,
          actorId: params.actorId,
          note: params.note,
        });
        await this.submitSectionForReviewUseCase.execute({
          sectionId: params.sectionId,
          actorId: params.actorId,
          note: params.note,
        });
        return;
      }

      await this.submitSectionForReviewUseCase.execute({
        sectionId: params.sectionId,
        actorId: params.actorId,
        note: params.note,
      });
      return;
    }

    if (params.status === 'CHANGES_REQUESTED') {
      await this.requestSectionChangesUseCase.execute({
        sectionId: params.sectionId,
        actorId: params.actorId,
        note: params.note ?? '',
      });
      return;
    }

    if (params.status === 'APPROVED') {
      await this.approveSectionUseCase.execute({
        sectionId: params.sectionId,
        actorId: params.actorId,
        note: params.note,
        signature: params.signature,
      });
      return;
    }

    throw new BadRequestException(
      `Unsupported section status transition: ${params.status}`,
    );
  }

  async list(projectId: string, userId: string, companyId: string) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    const sectionInclude: any = {
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
      },
    };
    return (this.prisma as any).section.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: sectionInclude,
    });
  }

  async save(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateSectionCommand,
  ) {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const existing = await this.prisma.section.findFirst({
      where: { projectId, name: dto.name },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    const baseInclude: any = {
      lastEditor: { select: { id: true, email: true } },
      comments: {
        include: { author: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
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
      },
    };
    if (existing) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const updated = await (tx as any).section.update({
          where: { id: existing.id },
          data: {
            content: dto.content,
            lastEditorId: userId,
            status: 'DRAFT' as any,
            workflowStatus: 'DRAFT' as any,
          },
          include: baseInclude,
        });
        return updated;
      });
      if (
        project &&
        (project.status === 'APPROVED' || project.status === 'IN_REVIEW')
      ) {
        await this.reopenProjectAfterSectionEditUseCase.execute({
          projectId,
          actorId: userId,
          note: 'Section edited; re-review required',
        });
      }
      return updated;
    }
    const createInclude: any = baseInclude;
    return (this.prisma as any).section.create({
      data: {
        ...dto,
        projectId,
        lastEditorId: userId,
      },
      include: createInclude,
    });
  }

  async update(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
    dto: UpdateSectionCommand,
  ) {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await (tx as any).section.update({
        where: { id: sectionId },
        data: {
          content: dto.content,
          lastEditorId: userId,
          status: 'DRAFT' as any,
          workflowStatus: 'DRAFT' as any,
        },
        include: {
          lastEditor: { select: { id: true, email: true } },
          comments: {
            include: {
              author: { select: { id: true, email: true } },
            },
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
          },
        },
      });
      return updated;
    });
    if (
      project &&
      (project.status === 'APPROVED' || project.status === 'IN_REVIEW')
    ) {
      await this.reopenProjectAfterSectionEditUseCase.execute({
        projectId,
        actorId: userId,
        note: 'Section edited; re-review required',
      });
    }
    return updated;
  }

  async addComment(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
    dto: CreateSectionCommentCommand,
  ) {
    const access = await this.projectsService.assertAccess(
      projectId,
      userId,
      companyId,
      { allowOwner: true, allowReviewer: true, allowApprover: true },
    );
    const workspaceId = access.project.companyId ?? companyId;
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    const comment = await this.prisma.sectionComment.create({
      data: {
        body: dto.body,
        sectionId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, email: true } },
      },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        reviewerId: true,
        approverId: true,
        name: true,
        companyId: true,
      },
    });
    if (project) {
      const targetWorkspaceId = project.companyId ?? workspaceId;
      const recipients = new Set<string>();
      if (project.ownerId && project.ownerId !== userId) {
        recipients.add(project.ownerId);
      }
      if (access.accessRole === 'OWNER') {
        if (project.reviewerId && project.reviewerId !== userId) {
          recipients.add(project.reviewerId);
        }
        if (project.approverId && project.approverId !== userId) {
          recipients.add(project.approverId);
        }
      }
      for (const recipientId of recipients) {
        await this.notifications.create({
          userId: recipientId,
          title: `New comment on ${section.name}`,
          body: dto.body.slice(0, 140),
          type: 'comment',
          meta: { projectId, sectionId, companyId: targetWorkspaceId },
        });
      }
    }
    return comment;
  }

  async listComments(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
  ) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
    });
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    return this.prisma.sectionComment.findMany({
      where: { sectionId },
      include: {
        author: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async suggest(
    projectId: string,
    sectionName: string,
    userId: string,
    companyId: string,
    dto: SuggestSectionCommand,
  ) {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const sections = await this.prisma.section.findMany({
      where: { projectId },
    });
    const merged = sections.reduce<Record<string, any>>((acc, section) => {
      acc[section.name] = section.content;
      return acc;
    }, {});
    merged['target_section'] = sectionName;
    if (dto.partialContent) {
      merged['partial_content'] = dto.partialContent;
    }
    if (dto.hint) {
      merged['hint'] = dto.hint;
    }
    if (dto.targetField) {
      merged['target_field'] = dto.targetField;
    }
    const suggestion = await this.llmService.generate('section_helper', merged);
    let structured: Record<string, any> | undefined;
    let summary = this.sanitizeSuggestionText(suggestion);
    const parsed = this.parseSuggestionJson(suggestion);
    if (parsed && typeof parsed === 'object') {
      if (dto.targetField) {
        const value = parsed.fields?.[dto.targetField] ?? parsed.summary;
        if (value !== undefined) {
          summary = this.sanitizeSuggestionText(value);
          structured = {
            [dto.targetField]: summary,
          };
        }
      } else {
        summary = this.sanitizeSuggestionText(parsed.summary ?? summary);
        if (parsed.fields && typeof parsed.fields === 'object') {
          structured = Object.entries(parsed.fields).reduce(
            (acc, [key, value]) => {
              acc[key] = this.sanitizeSuggestionText(value);
              return acc;
            },
            {} as Record<string, string>,
          );
        }
      }
    } else if (dto.targetField) {
      structured = { [dto.targetField]: summary };
    }
    return { suggestion: summary, structuredContent: structured };
  }

  private sanitizeSuggestionText(value: unknown): string {
    const raw = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    return raw
      .replace(/```[\w-]*\s?/gi, '')
      .replace(/```/g, '')
      .trim();
  }

  private parseSuggestionJson(value: string) {
    const cleaned = value
      .replace(/```[\w-]*\s?/gi, '')
      .replace(/```/g, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return undefined;
    }
  }

  async updateStatus(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
    dto: UpdateSectionStatusCommand,
  ) {
    const access = await this.projectsService.assertAccess(
      projectId,
      userId,
      companyId,
      { allowOwner: true, allowReviewer: true, allowApprover: true },
    );
    const workspaceId = access.project.companyId ?? companyId;
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    // Enforce plan-based review limits on approval / change requests
    if (dto.status === 'APPROVED' || dto.status === 'CHANGES_REQUESTED') {
      await this.monetization.checkAndConsumeForProject(projectId, 'review', 1);
    }
    await this.applyLegacySectionStatusTransition({
      sectionId,
      actorId: userId,
      status: dto.status,
      note: dto.note,
      signature: dto.signature,
    });
    // Auto-notify approver if all sections are approved
    const sections = await this.prisma.section.findMany({
      where: { projectId },
      select: { status: true },
    });
    const allApproved =
      sections.length > 0 && sections.every((s) => s.status === 'APPROVED');
    if (allApproved) {
      const projectAny = (await (this.prisma as any).project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          companyId: true,
          approverId: true,
          approver: { select: { email: true } },
          owner: true,
        } as any,
      })) as any;
      if (projectAny?.approver?.email) {
        const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/projects/${projectId}?companyId=${projectAny.companyId ?? workspaceId}`;
        const subject = `Approval requested: ${projectAny.name}`;
        const body = `All sections have been approved by reviewers. Please approve the project.\n\nLink: ${link}`;
        await this.emailService.sendReminder(
          projectAny.approver.email,
          subject,
          body,
        );
        await this.notifications.create({
          userId: projectAny.approverId,
          title: `Approval requested: ${projectAny.name}`,
          body: 'All sections are approved and ready for your approval.',
          type: 'approval',
          meta: { projectId, companyId: projectAny.companyId ?? workspaceId },
        });
        await this.prisma.projectStatusEvent.create({
          data: {
            projectId,
            status: 'IN_REVIEW',
            note: '[workflow:IN_REVIEW] All sections approved; approver notified',
            actorId: userId,
          },
        });
      }
    }
    return this.list(projectId, userId, companyId);
  }
}
