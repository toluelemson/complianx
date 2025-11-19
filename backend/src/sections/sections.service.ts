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

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(projectId: string, userId: string) {
    await this.projectsService.assertOwnership(projectId, userId);
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

  async save(projectId: string, userId: string, dto: CreateSectionDto) {
    await this.projectsService.assertOwnership(projectId, userId);
    const existing = await this.prisma.section.findFirst({
      where: { projectId, name: dto.name },
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
    return (this.prisma as any).section.update({
      where: { id: existing.id },
      data: { content: dto.content, lastEditorId: userId },
      include: baseInclude,
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
    dto: UpdateSectionDto,
  ) {
    await this.projectsService.assertOwnership(projectId, userId);
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    return this.prisma.section.update({
      where: { id: sectionId },
      data: { content: dto.content, lastEditorId: userId },
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
  }

  async addComment(
    projectId: string,
    sectionId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    await this.projectsService.assertOwnership(projectId, userId);
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    return this.prisma.sectionComment.create({
      data: {
        body: dto.body,
        sectionId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, email: true } },
      },
    });
  }

  async listComments(projectId: string, sectionId: string, userId: string) {
    await this.projectsService.assertOwnership(projectId, userId);
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
    dto: SuggestSectionDto,
  ) {
    await this.projectsService.assertOwnership(projectId, userId);
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
    dto: UpdateSectionStatusDto,
  ) {
    const actor = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (!actor) {
      throw new NotFoundException('User not found');
    }
    await this.projectsService.assertOwnership(projectId, userId);
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      throw new NotFoundException('Section not found');
    }
    if (dto.status === 'APPROVED' && actor.role === 'USER') {
      throw new ForbiddenException('Only reviewers can approve sections');
    }
    if (dto.status === 'APPROVED' && !dto.signature?.trim()) {
      throw new BadRequestException('Signature is required to approve');
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
        include: ({ approver: { select: { email: true } }, owner: true } as any),
      })) as any;
      if (projectAny?.approver?.email) {
        const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/projects/${projectId}`;
        const subject = `Approval requested: ${projectAny.name}`;
        const body = `All sections have been approved by reviewers. Please approve the project.\n\nLink: ${link}`;
        await this.emailService.sendReminder(projectAny.approver.email, subject, body);
        await this.notifications.create({
          userId: projectAny.approverId,
          title: `Approval requested: ${projectAny.name}`,
          body: 'All sections are approved and ready for your approval.',
          type: 'approval',
          meta: { projectId },
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
    return this.list(projectId, userId);
  }
}
