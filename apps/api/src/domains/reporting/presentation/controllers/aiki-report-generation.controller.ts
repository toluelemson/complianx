import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { GeneratorService } from '../../application/report-generation/generator.service';

type ReportGenerationJob = {
  projectId?: string;
  userId?: string;
  documentTypes?: string[];
  operationId?: string;
};

@Controller('internal/aiki')
export class AikiReportGenerationController {
  constructor(
    private readonly config: ConfigService,
    private readonly generator: GeneratorService,
  ) {}

  @Post('report-generation')
  async generate(
    @Headers('authorization') authorization: string | undefined,
    @Body() job: ReportGenerationJob,
  ) {
    const configuredToken = this.config.get<string>('AIKI_SERVICE_TOKEN') ?? '';
    const token = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!tokensMatch(token, configuredToken)) throw new ForbiddenException();
    if (!job.projectId || !job.userId || !job.operationId) {
      throw new ForbiddenException();
    }
    return this.generator.generate(
      job.projectId,
      job.userId,
      Array.isArray(job.documentTypes) ? job.documentTypes : undefined,
      job.operationId,
    );
  }
}

function tokensMatch(received: string, configured: string) {
  if (!received || !configured || received.length !== configured.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(received), Buffer.from(configured));
}
