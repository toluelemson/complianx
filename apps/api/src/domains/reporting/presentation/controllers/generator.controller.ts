import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GeneratorService } from '../../application/report-generation/generator.service';
import { ReportGenerationQueueService } from '../../application/report-generation/report-generation-queue.service';
import {
  LlmAuthenticationError,
  LlmConfigurationError,
} from '../../../../platform/ai/llm.service';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/generate')
export class GeneratorController {
  constructor(
    private readonly generatorService: GeneratorService,
    private readonly queue: ReportGenerationQueueService,
  ) {}

  @Get('readiness')
  getReadiness(@Param('projectId') projectId: string, @Request() req) {
    return this.generatorService.getReadiness(projectId, req.user.userId);
  }

  @Post()
  async generate(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body('documentTypes') documentTypes?: string[],
    @Body('operationId') operationId?: string,
  ) {
    try {
      const readiness = await this.generatorService.getReadiness(
        projectId,
        req.user.userId,
      );
      if (readiness.status === 'insufficient') {
        throw new BadRequestException({
          message:
            'There is not enough structured project information to generate defensible documentation yet.',
          code: 'READINESS_BLOCKED',
          readiness,
        });
      }
      return await this.queue.enqueue({
        projectId,
        userId: req.user.userId,
        documentTypes,
        operationId: operationId ?? randomUUID(),
      });
    } catch (error: unknown) {
      if (
        error instanceof LlmAuthenticationError ||
        error instanceof LlmConfigurationError
      ) {
        throw new ServiceUnavailableException({
          code: 'DOCUMENT_GENERATION_UNAVAILABLE',
          message:
            'Document generation is temporarily unavailable. Please contact an administrator.',
        });
      }
      throw error;
    }
  }
}
