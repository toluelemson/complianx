import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TemplateItem } from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../platform/database/prisma.service';
import {
  BulkTemplateActionDto,
  TemplateBulkAction,
} from '../presentation/dto/bulk-template-action.dto';
import { CreateTemplateDto } from '../presentation/dto/create-template.dto';
import { UpdateTemplateDto } from '../presentation/dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTemplate(template: {
    id: string;
    name: string;
    ownerId: string;
    sectionName: string;
    category: string | null;
    shared: boolean;
    content?: unknown;
    owner?: { email?: string; id?: string } | null;
  }): TemplateItem {
    return {
      id: template.id,
      name: template.name,
      ownerId: template.ownerId,
      sectionName: template.sectionName,
      category: template.category ?? undefined,
      shared: template.shared,
      owner: template.owner?.email ? { email: template.owner.email } : undefined,
      content:
        template.content && typeof template.content === 'object'
          ? (template.content as Record<string, unknown>)
          : undefined,
    };
  }

  listForUser(userId: string, sectionName?: string): Promise<TemplateItem[]> {
    return this.prisma.sectionTemplate.findMany({
      where: {
        sectionName: sectionName ?? undefined,
        OR: [{ ownerId: userId }, { shared: true }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, email: true } },
      },
    }).then((templates) => templates.map((template) => this.mapTemplate(template)));
  }

  async create(userId: string, dto: CreateTemplateDto): Promise<TemplateItem> {
    const existing = await this.prisma.sectionTemplate.findFirst({
      where: {
        ownerId: userId,
        sectionName: dto.sectionName,
        name: dto.name,
      },
    });
    if (existing) {
      throw new ConflictException('Template with that name already exists');
    }
    const duplicateContent = await this.prisma.sectionTemplate.findFirst({
      where: {
        ownerId: userId,
        sectionName: dto.sectionName,
        content: dto.content,
      },
    });
    if (duplicateContent) {
      throw new ConflictException(
        'Template with identical content already exists',
      );
    }
    return this.prisma.sectionTemplate.create({
      data: {
        name: dto.name,
        sectionName: dto.sectionName,
        content: dto.content,
        ownerId: userId,
        category: dto.category,
        shared: dto.shared ?? false,
      },
    }).then((template) => this.mapTemplate(template));
  }

  async update(
    userId: string,
    templateId: string,
    dto: UpdateTemplateDto,
  ): Promise<TemplateItem> {
    const template = await this.prisma.sectionTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    if (template.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can update the template');
    }
    return this.prisma.sectionTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...('category' in dto ? { category: dto.category } : {}),
        ...(dto.shared !== undefined ? { shared: dto.shared } : {}),
      },
    }).then((updatedTemplate) => this.mapTemplate(updatedTemplate));
  }

  async delete(userId: string, templateId: string): Promise<TemplateItem> {
    const template = await this.prisma.sectionTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    if (template.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete the template');
    }
    return this.prisma.sectionTemplate
      .delete({ where: { id: templateId } })
      .then((template) => this.mapTemplate(template));
  }

  async bulkAction(
    userId: string,
    dto: BulkTemplateActionDto,
  ): Promise<TemplateItem[]> {
    const templates = await this.prisma.sectionTemplate.findMany({
      where: { id: { in: dto.templateIds } },
    });
    if (templates.length !== dto.templateIds.length) {
      throw new NotFoundException('One or more templates not found');
    }
    templates.forEach((template) => {
      if (template.ownerId !== userId) {
        throw new ForbiddenException(
          'Only template owners can perform bulk actions',
        );
      }
    });
    const actions = {
      [TemplateBulkAction.SHARE]: (template: any) =>
        this.prisma.sectionTemplate.update({
          where: { id: template.id },
          data: { shared: true },
        }),
      [TemplateBulkAction.UNSHARE]: (template: any) =>
        this.prisma.sectionTemplate.update({
          where: { id: template.id },
          data: { shared: false },
        }),
      [TemplateBulkAction.DELETE]: (template: any) =>
        this.prisma.sectionTemplate.delete({ where: { id: template.id } }),
    };
    return this.prisma.$transaction(
      templates.map((template) => actions[dto.action](template)),
    ).then((updatedTemplates) =>
      updatedTemplates.map((template) => this.mapTemplate(template)),
    );
  }
}
