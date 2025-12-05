import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TrustService } from './trust.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMetricDto } from './dto/create-metric.dto';
import { CreateSampleDto } from './dto/create-sample.dto';
import { AnalyzeFairnessDto } from './dto/analyze-fairness.dto';
import { AnalyzeRobustnessDto } from './dto/analyze-robustness.dto';
import { AnalyzeDriftDto } from './dto/analyze-drift.dto';
import { AnalyzeFairnessSegmentsDto } from './dto/analyze-fairness-segments.dto';
import { CompanyContextService } from '../company/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TrustController {
  constructor(
    private readonly trustService: TrustService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get('projects/:projectId/metrics')
  list(@Param('projectId') projectId: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.listByProject(
      projectId,
      req.user.userId,
      companyId,
    );
  }

  @Post('projects/:projectId/metrics')
  create(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() dto: CreateMetricDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.create(
      projectId,
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Post('metrics/:metricId/samples')
  addSample(
    @Param('metricId') metricId: string,
    @Request() req,
    @Body() dto: CreateSampleDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.addSample(
      metricId,
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Post('trust/fairness/analyze')
  analyzeFairness(@Request() req, @Body() dto: AnalyzeFairnessDto) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeFairness(req.user.userId, companyId, dto);
  }

  @Post('trust/fairness/segments')
  analyzeFairnessSegments(
    @Request() req,
    @Body() dto: AnalyzeFairnessSegmentsDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeFairnessSegments(
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Delete('metrics/:metricId')
  removeMetric(@Param('metricId') metricId: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.removeMetric(metricId, req.user.userId, companyId);
  }

  // Nested alias to align with other project-scoped routes
  @Delete('projects/:projectId/metrics/:metricId')
  removeMetricNested(
    @Param('metricId') metricId: string,
    @Param('projectId') _projectId: string,
    @Request() req,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.removeMetric(metricId, req.user.userId, companyId);
  }

  @Delete('samples/:sampleId')
  removeSample(@Param('sampleId') sampleId: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.removeSample(
      sampleId,
      req.user.userId,
      companyId,
    );
  }

  @Post('trust/robustness/analyze')
  analyzeRobustness(@Request() req, @Body() dto: AnalyzeRobustnessDto) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeRobustness(
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Post('trust/drift/analyze')
  analyzeDrift(@Request() req, @Body() dto: AnalyzeDriftDto) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeDrift(req.user.userId, companyId, dto);
  }
}
