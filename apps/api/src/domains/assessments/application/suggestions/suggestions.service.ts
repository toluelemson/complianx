import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { RecordSuggestionFeedbackCommand } from './suggestion.commands';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectsService) {}

  async recordFeedback(userId: string, dto: RecordSuggestionFeedbackCommand) {
    await this.prisma.project.findFirstOrThrow({
      where: { id: dto.projectId, ownerId: userId },
    });
    return this.prisma.suggestionFeedback.create({
      data: {
        projectId: dto.projectId,
        sectionId: dto.sectionId,
        fieldName: dto.fieldName,
        suggestion: dto.suggestion,
        liked: dto.liked,
        userId,
      },
    });
  }

  async listForField(sectionId: string, fieldName: string, userId: string, companyId: string) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) return [];
    await this.projects.assertAccess(section.projectId, userId, companyId, {
      allowOwner: true, allowReviewer: true, allowApprover: true, allowCompanyMember: true,
    });
    return this.prisma.suggestionFeedback.findMany({
      where: { sectionId, fieldName },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }
}
