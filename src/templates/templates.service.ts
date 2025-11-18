import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkTemplateActionDto, TemplateBulkAction } from './dto/bulk-template-action.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string, sectionName?: string) {
    return this.prisma.sectionTemplate.findMany({
      where: {
        sectionName: sectionName ?? undefined,
        OR: [
          { ownerId: userId },
          { shared: true },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, email: true } },
      },
    });
  }

  async create(userId: string, dto: CreateTemplateDto) {
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
      throw new ConflictException('Template with identical content already exists');
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
    });
  }

  async update(userId: string, templateId: string, dto: UpdateTemplateDto) {
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
    });
  }

  async delete(userId: string, templateId: string) {
    const template = await this.prisma.sectionTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    if (template.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete the template');
    }
    return this.prisma.sectionTemplate.delete({ where: { id: templateId } });
  }

  async bulkAction(userId: string, dto: BulkTemplateActionDto) {
    const templates = await this.prisma.sectionTemplate.findMany({
      where: { id: { in: dto.templateIds } },
    });
    if (templates.length !== dto.templateIds.length) {
      throw new NotFoundException('One or more templates not found');
    }
    templates.forEach((template) => {
      if (template.ownerId !== userId) {
        throw new ForbiddenException('Only template owners can perform bulk actions');
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
    );
  }
}
