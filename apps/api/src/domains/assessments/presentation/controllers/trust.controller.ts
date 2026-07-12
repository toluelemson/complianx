import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TrustService } from '../../application/trust/trust.service';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CreateMetricDto } from '../dto/trust/create-metric.dto';
import { CreateSampleDto } from '../dto/trust/create-sample.dto';
import { AnalyzeFairnessDto } from '../dto/trust/analyze-fairness.dto';
import { AnalyzeRobustnessDto } from '../dto/trust/analyze-robustness.dto';
import { AnalyzeDriftDto } from '../dto/trust/analyze-drift.dto';
import { AnalyzeFairnessSegmentsDto } from '../dto/trust/analyze-fairness-segments.dto';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class TrustController {
  constructor(
    private readonly trustService: TrustService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get('projects/:projectId/metrics')
  list(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
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
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMetricDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.create(projectId, req.user.userId, companyId, dto);
  }

  @Post('metrics/:metricId/samples')
  addSample(
    @Param('metricId') metricId: string,
    @Req() req: AuthenticatedRequest,
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
  analyzeFairness(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AnalyzeFairnessDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeFairness(req.user.userId, companyId, dto);
  }

  @Post('trust/fairness/segments')
  analyzeFairnessSegments(
    @Req() req: AuthenticatedRequest,
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
  removeMetric(
    @Param('metricId') metricId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.removeMetric(metricId, req.user.userId, companyId);
  }

  // Nested alias to align with other project-scoped routes
  @Delete('projects/:projectId/metrics/:metricId')
  removeMetricNested(
    @Param('metricId') metricId: string,
    @Param('projectId') _projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.removeMetric(metricId, req.user.userId, companyId);
  }

  @Delete('samples/:sampleId')
  removeSample(
    @Param('sampleId') sampleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.removeSample(sampleId, req.user.userId, companyId);
  }

  @Post('trust/robustness/analyze')
  analyzeRobustness(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AnalyzeRobustnessDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeRobustness(req.user.userId, companyId, dto);
  }

  @Post('trust/drift/analyze')
  analyzeDrift(@Req() req: AuthenticatedRequest, @Body() dto: AnalyzeDriftDto) {
    const companyId = this.resolveCompanyId(req);
    return this.trustService.analyzeDrift(req.user.userId, companyId, dto);
  }
}
