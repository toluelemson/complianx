import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordFeedback(userId: string, dto: CreateFeedbackDto) {
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

  async listForField(sectionId: string, fieldName: string) {
    return this.prisma.suggestionFeedback.findMany({
      where: { sectionId, fieldName },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }
}
