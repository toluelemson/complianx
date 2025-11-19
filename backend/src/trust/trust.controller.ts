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

@UseGuards(JwtAuthGuard)
@Controller()
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Get('projects/:projectId/metrics')
  list(@Param('projectId') projectId: string, @Request() req) {
    return this.trustService.listByProject(projectId, req.user.userId);
  }

  @Post('projects/:projectId/metrics')
  create(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() dto: CreateMetricDto,
  ) {
    return this.trustService.create(projectId, req.user.userId, dto);
  }

  @Post('metrics/:metricId/samples')
  addSample(
    @Param('metricId') metricId: string,
    @Request() req,
    @Body() dto: CreateSampleDto,
  ) {
    return this.trustService.addSample(metricId, req.user.userId, dto);
  }

  @Post('trust/fairness/analyze')
  analyzeFairness(@Request() req, @Body() dto: AnalyzeFairnessDto) {
    return this.trustService.analyzeFairness(req.user.userId, dto);
  }

  @Post('trust/fairness/segments')
  analyzeFairnessSegments(
    @Request() req,
    @Body() dto: AnalyzeFairnessSegmentsDto,
  ) {
    return this.trustService.analyzeFairnessSegments(req.user.userId, dto);
  }

  @Delete('metrics/:metricId')
  removeMetric(@Param('metricId') metricId: string, @Request() req) {
    return this.trustService.removeMetric(metricId, req.user.userId);
  }

  // Nested alias to align with other project-scoped routes
  @Delete('projects/:projectId/metrics/:metricId')
  removeMetricNested(
    @Param('metricId') metricId: string,
    @Param('projectId') _projectId: string,
    @Request() req,
  ) {
    return this.trustService.removeMetric(metricId, req.user.userId);
  }

  @Delete('samples/:sampleId')
  removeSample(@Param('sampleId') sampleId: string, @Request() req) {
    return this.trustService.removeSample(sampleId, req.user.userId);
  }

  @Post('trust/robustness/analyze')
  analyzeRobustness(@Request() req, @Body() dto: AnalyzeRobustnessDto) {
    return this.trustService.analyzeRobustness(req.user.userId, dto);
  }

  @Post('trust/drift/analyze')
  analyzeDrift(@Request() req, @Body() dto: AnalyzeDriftDto) {
    return this.trustService.analyzeDrift(req.user.userId, dto);
  }
}
