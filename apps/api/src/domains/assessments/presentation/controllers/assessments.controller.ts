import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';
import { AssessmentsService } from '../../application/classification/assessments.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentAnswersDto } from '../dto/update-assessment-answers.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai-systems/:aiSystemId/assessments')
export class AssessmentsController {
  constructor(
    private readonly assessments: AssessmentsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
  }

  @Post()
  create(
    @Param('aiSystemId') aiSystemId: string,
    @Body() dto: CreateAssessmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.create(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
      dto.packVersion,
    );
  }

  @Get(':assessmentId')
  get(
    @Param('assessmentId') assessmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.get(
      assessmentId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Put(':assessmentId/answers')
  updateAnswers(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: UpdateAssessmentAnswersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateAnswers(
      assessmentId,
      req.user.userId,
      this.companyId(req),
      dto.answers,
    );
  }

  @Post(':assessmentId/classify')
  classify(
    @Param('assessmentId') assessmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.classify(
      assessmentId,
      req.user.userId,
      this.companyId(req),
    );
  }
}
