import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SuggestSectionDto } from './dto/suggest-section.dto';
import { LlmService } from '../llm/llm.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateSectionStatusDto } from './dto/update-section-status.dto';
import { MonetizationService } from '../monetization/monetization.service';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
    private readonly monetization: MonetizationService,
  ) {}

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
    dto: CreateSectionDto,
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
      return this.prisma.$transaction(async (tx) => {
        const updated = await (tx as any).section.update({
          where: { id: existing.id },
          data: { content: dto.content, lastEditorId: userId, status: 'DRAFT' as any },
          include: baseInclude,
        });
        if (project && (project.status === 'APPROVED' || project.status === 'IN_REVIEW')) {
          await (tx as any).project.update({
            where: { id: projectId },
            data: { status: 'CHANGES_REQUESTED' as any },
          });
          await (tx as any).projectStatusEvent.create({
            data: ({
              projectId,
              status: 'CHANGES_REQUESTED' as any,
              note: 'Section edited; re-review required',
              actorId: userId,
            } as any),
          });
        }
        return updated;
      });
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
    dto: UpdateSectionDto,
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await (tx as any).section.update({
        where: { id: sectionId },
        data: { content: dto.content, lastEditorId: userId, status: 'DRAFT' as any },
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
      if (project && (project.status === 'APPROVED' || project.status === 'IN_REVIEW')) {
        await (tx as any).project.update({
          where: { id: projectId },
          data: { status: 'CHANGES_REQUESTED' as any },
        });
        await (tx as any).projectStatusEvent.create({
          data: ({
            projectId,
            status: 'CHANGES_REQUESTED' as any,
            note: 'Section edited; re-review required',
            actorId: userId,
          } as any),
        });
      }
      return updated;
    });
  }

  async addComment(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
    dto: CreateCommentDto,
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
    dto: SuggestSectionDto,
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
    dto: UpdateSectionStatusDto,
  ) {
    const actor = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (!actor) {
      throw new NotFoundException('User not found');
    }
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
    const membershipRole = access.membershipRole ?? actor.role;
    const isReviewerRole =
      membershipRole === 'REVIEWER' || membershipRole === 'ADMIN';
    if (dto.status === 'APPROVED' && !isReviewerRole) {
      throw new ForbiddenException('Only reviewers can approve sections');
    }
    if (dto.status === 'APPROVED' && !dto.signature?.trim()) {
      throw new BadRequestException('Signature is required to approve');
    }
    // Enforce plan-based review limits on approval / change requests
    if (dto.status === 'APPROVED' || dto.status === 'CHANGES_REQUESTED') {
      await this.monetization.checkAndConsumeForProject(projectId, 'review', 1);
    }
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).section.update({
        where: { id: sectionId },
        data: { status: dto.status },
      });
      await (tx as any).sectionStatusEvent.create({
        data: ({
          sectionId,
          status: dto.status,
          note: dto.note,
          signature: dto.signature?.trim(),
          actorId: userId,
        } as any),
      });
      if (dto.status === 'CHANGES_REQUESTED') {
        await (tx as any).project.update({
          where: { id: projectId },
          data: { status: 'CHANGES_REQUESTED' as any },
        });
        await (tx as any).projectStatusEvent.create({
          data: ({
            projectId,
            status: 'CHANGES_REQUESTED' as any,
            note: dto.note ?? 'Section changes requested',
            actorId: userId,
          } as any),
        });
      }
    });
    // Auto-notify approver if all sections are approved
    const sections = await this.prisma.section.findMany({
      where: { projectId },
      select: { status: true },
    });
    const allApproved = sections.length > 0 && sections.every((s) => s.status === 'APPROVED');
    if (allApproved) {
      const projectAny = (await (this.prisma as any).project.findUnique({
        where: { id: projectId },
        select: ({
          id: true,
          name: true,
          companyId: true,
          approverId: true,
          approver: { select: { email: true } },
          owner: true,
        } as any),
      })) as any;
      if (projectAny?.approver?.email) {
        const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/projects/${projectId}?companyId=${projectAny.companyId ?? workspaceId}`;
        const subject = `Approval requested: ${projectAny.name}`;
        const body = `All sections have been approved by reviewers. Please approve the project.\n\nLink: ${link}`;
        await this.emailService.sendReminder(projectAny.approver.email, subject, body);
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
            note: 'All sections approved; approver notified',
            actorId: userId,
          },
        });
      }
    }
    if (
      (dto.status === 'APPROVED' || dto.status === 'CHANGES_REQUESTED') &&
      access.project.ownerId !== userId
    ) {
      const owner = await this.prisma.user.findUnique({
        where: { id: access.project.ownerId },
        select: { id: true, email: true },
      });
      if (owner) {
        await this.notifications.create({
          userId: owner.id,
          title:
            dto.status === 'APPROVED'
              ? `Section approved: ${section.name}`
              : `Changes requested: ${section.name}`,
          body:
            dto.note?.trim() ||
            (dto.status === 'APPROVED'
              ? 'A reviewer approved a section.'
              : 'A reviewer requested changes.'),
          type: 'review',
          meta: { projectId, sectionId, companyId: workspaceId },
        });
      }
    }
    return this.list(projectId, userId, companyId);
  }
}
