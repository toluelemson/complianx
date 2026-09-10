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
import { GeneratorService } from '../../application/report-generation/generator.service';
import {
  LlmAuthenticationError,
  LlmConfigurationError,
} from '../../../../platform/ai/llm.service';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/generate')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Get('readiness')
  getReadiness(@Param('projectId') projectId: string, @Request() req) {
    return this.generatorService.getReadiness(projectId, req.user.userId);
  }

  @Post()
  generate(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body('documentTypes') documentTypes?: string[],
    @Body('operationId') operationId?: string,
  ) {
    return this.generatorService
      .generate(projectId, req.user.userId, documentTypes, operationId)
      .catch((error: unknown) => {
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
      });
  }
}
