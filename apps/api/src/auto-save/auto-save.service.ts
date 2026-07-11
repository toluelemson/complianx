import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveSectionDto } from './dto/save-section.dto';

@Injectable()
export class AutoSaveService {
  constructor(private readonly prisma: PrismaService) {}

  async saveSection(userId: string, dto: SaveSectionDto) {
    const section = await (this.prisma as any).section.findUnique({
      where: { id: dto.sectionId },
    });
    if (!section) {
      throw new Error('Section not found');
    }
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

  async getSectionAutosave(sectionId: string) {
    return (this.prisma as any).sectionAutosave.findUnique({
      where: { sectionId },
    });
  }

  async deleteSectionAutosave(sectionId: string) {
    await (this.prisma as any).sectionAutosave.delete({
      where: { sectionId },
    });
  }
}
