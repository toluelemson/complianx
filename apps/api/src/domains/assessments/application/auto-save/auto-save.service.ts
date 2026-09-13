import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { SaveSectionDto } from '../../presentation/dto/save-section.dto';

@Injectable()
export class AutoSaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async saveSection(userId: string, companyId: string, dto: SaveSectionDto) {
    const section = await (this.prisma as any).section.findUnique({
      where: { id: dto.sectionId },
    });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    await this.projectsService.assertOwnership(section.projectId, userId, companyId);
    const autosave = await (this.prisma as any).sectionAutosave.upsert({
      where: { sectionId: dto.sectionId },
      create: {
        sectionId: dto.sectionId,
        content: dto.content,
      },
      update: {
        content: dto.content,
        updatedAt: new Date(),
      },
      include: { section: true },
    });
    await (this.prisma as any).section.update({
      where: { id: dto.sectionId },
      data: {
        content: dto.content,
        lastEditorId: userId,
      },
    });
    return autosave;
  }

  async getSectionAutosave(sectionId: string, userId: string, companyId: string) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.projectsService.assertAccess(section.projectId, userId, companyId, {
      allowOwner: true, allowReviewer: true, allowApprover: true, allowCompanyMember: true,
    });
    return (this.prisma as any).sectionAutosave.findUnique({
      where: { sectionId },
    });
  }

  async deleteSectionAutosave(sectionId: string, userId: string, companyId: string) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.projectsService.assertOwnership(section.projectId, userId, companyId);
    await (this.prisma as any).sectionAutosave.delete({
      where: { sectionId },
    });
  }
}
