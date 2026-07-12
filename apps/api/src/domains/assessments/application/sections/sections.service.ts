import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  SectionArtifactItem,
  SectionComment,
  SectionWithMeta,
  SuggestionResponse,
  StatusEvent,
} from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import {
  Prisma,
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from '@prisma/client';
import {
  CreateSectionCommand,
  CreateSectionCommentCommand,
  SuggestSectionCommand,
  UpdateSectionCommand,
} from './section.commands';
import { LlmService } from '../../../../platform/ai/llm.service';
import { NotificationsService } from '../../../notifications/application/notifications.service';
import { MonetizationService } from '../../../subscriptions/application/monetization.service';
import { ReopenProjectAfterSectionEditUseCase } from '../../../review-approval/application/reopen-project-after-section-edit.use-case';

const sectionDetailInclude = Prisma.validator<Prisma.SectionInclude>()({
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
});

type SuggestionJson = {
  summary?: unknown;
  fields?: Record<string, unknown>;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapComment(comment: {
  id: string;
  body: string;
  createdAt: Date;
  author?: { id: string; email: string } | null;
}): SectionComment {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author ?? undefined,
  };
}

function mapSection(section: {
  id: string;
  name: string;
  content: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  workflowStatus: string;
  lastEditor?: { id: string; email: string } | null;
  comments?: Array<Parameters<typeof mapComment>[0]>;
  statusEvents?: Array<{
    id: string;
    status: string;
    note?: string | null;
    signature?: string | null;
    createdAt: Date;
    actor?: { id: string; email: string } | null;
  }>;
  artifacts?: Array<{
    id: string;
    originalName: string;
    description?: string | null;
    createdAt: Date;
    size: number;
    mimeType: string;
    version: number;
    checksum: string;
    citationKey: string;
    status: string;
    reviewComment?: string | null;
    reviewedAt?: Date | null;
    uploadedBy?: { id: string; email: string } | null;
    reviewedBy?: { id: string; email: string } | null;
    previousArtifact?: {
      id: string;
      version: number;
      checksum: string;
      citationKey: string;
    } | null;
  }>;
}): SectionWithMeta {
  return {
    id: section.id,
    name: section.name,
    content: asRecord(section.content),
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
    workflowStatus: section.workflowStatus as SectionWithMeta['workflowStatus'],
    lastEditor: section.lastEditor ?? undefined,
    comments: (section.comments ?? []).map(mapComment),
    statusEvents: section.statusEvents?.map((event) => ({
      id: event.id,
      status: event.status as StatusEvent['status'],
      note: event.note ?? undefined,
      signature: event.signature ?? undefined,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor ?? undefined,
    })),
    artifacts: section.artifacts?.map((artifact) => ({
      id: artifact.id,
      originalName: artifact.originalName,
      description: artifact.description ?? undefined,
      createdAt: artifact.createdAt.toISOString(),
      size: artifact.size,
      mimeType: artifact.mimeType,
      version: artifact.version,
      checksum: artifact.checksum,
      citationKey: artifact.citationKey,
      status: artifact.status as SectionArtifactItem['status'],
      reviewComment: artifact.reviewComment ?? undefined,
      reviewedAt: toIso(artifact.reviewedAt),
      uploadedBy: artifact.uploadedBy ?? undefined,
      reviewedBy: artifact.reviewedBy ?? undefined,
      previousArtifact: artifact.previousArtifact ?? undefined,
    })),
  };
}

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly notifications: NotificationsService,
    private readonly monetization: MonetizationService,
    private readonly reopenProjectAfterSectionEditUseCase: ReopenProjectAfterSectionEditUseCase,
  ) {}

  async list(
    projectId: string,
    userId: string,
    companyId: string,
  ): Promise<SectionWithMeta[]> {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return this.prisma.section.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: sectionDetailInclude,
    }).then((sections) => sections.map(mapSection));
  }

  async save(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateSectionCommand,
  ): Promise<SectionWithMeta> {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const existing = await this.prisma.section.findFirst({
      where: { projectId, name: dto.name },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workflowStatus: true },
    });
    if (existing) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.section.update({
          where: { id: existing.id },
          data: {
            content: dto.content as Prisma.InputJsonValue,
            lastEditorId: userId,
            workflowStatus: SectionWorkflowStatus.DRAFT,
          },
          include: sectionDetailInclude,
        });
        return mapSection(updated);
      });
      if (
        project &&
        (project.workflowStatus === ProjectWorkflowStatus.APPROVED ||
          project.workflowStatus === ProjectWorkflowStatus.IN_REVIEW)
      ) {
        await this.reopenProjectAfterSectionEditUseCase.execute({
          projectId,
          actorId: userId,
          note: 'Section edited; re-review required',
        });
      }
      return updated;
    }
    return this.prisma.section.create({
      data: {
        ...dto,
        content: dto.content as Prisma.InputJsonValue,
        projectId,
        lastEditorId: userId,
      },
      include: sectionDetailInclude,
    }).then(mapSection);
  }

  async update(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
    dto: UpdateSectionCommand,
  ): Promise<SectionWithMeta> {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workflowStatus: true },
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.section.update({
        where: { id: sectionId },
        data: {
          content: dto.content as Prisma.InputJsonValue,
          lastEditorId: userId,
          workflowStatus: SectionWorkflowStatus.DRAFT,
        },
        include: sectionDetailInclude,
      });
      return mapSection(updated);
    });
    if (
      project &&
      (project.workflowStatus === ProjectWorkflowStatus.APPROVED ||
        project.workflowStatus === ProjectWorkflowStatus.IN_REVIEW)
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
  ): Promise<SectionComment> {
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
    return mapComment(comment);
  }

  async listComments(
    projectId: string,
    sectionId: string,
    userId: string,
    companyId: string,
  ): Promise<SectionComment[]> {
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
    }).then((comments) => comments.map(mapComment));
  }

  async suggest(
    projectId: string,
    sectionName: string,
    userId: string,
    companyId: string,
    dto: SuggestSectionCommand,
  ): Promise<SuggestionResponse> {
    await this.projectsService.assertOwnership(projectId, userId, companyId);
    const sections = await this.prisma.section.findMany({
      where: { projectId },
    });
    const merged = sections.reduce<Record<string, unknown>>((acc, section) => {
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
    let structured: Record<string, string> | undefined;
    let summary = this.sanitizeSuggestionText(suggestion);
    const parsed = this.parseSuggestionJson(suggestion);
    if (parsed) {
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

  private parseSuggestionJson(value: string): SuggestionJson | undefined {
    const cleaned = value
      .replace(/```[\w-]*\s?/gi, '')
      .replace(/```/g, '')
      .trim();
    try {
      const parsed: unknown = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
      }
      const candidate = parsed as Record<string, unknown>;
      const fields =
        candidate.fields &&
        typeof candidate.fields === 'object' &&
        !Array.isArray(candidate.fields)
          ? (candidate.fields as Record<string, unknown>)
          : undefined;
      return {
        summary: candidate.summary,
        fields,
      };
    } catch {
      return undefined;
    }
  }
}
