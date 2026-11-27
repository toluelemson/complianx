import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';
import { AssessmentsService } from '../../application/classification/assessments.service';
import { CreateComplianceActionDto } from '../dto/create-compliance-action.dto';
import { UpdateComplianceActionDto } from '../dto/update-compliance-action.dto';
import { UpdateObligationDto } from '../dto/update-obligation.dto';
import { CreateFindingDto } from '../dto/create-finding.dto';
import { UpdateFindingDto } from '../dto/update-finding.dto';
import {
  CreateComplianceStakeholderDto,
  CreateDocumentationItemDto,
  CreateLifecycleEventDto,
  CreateSystemAssetDto,
  CreateTechnicalMeasureDto,
  UpdateAssessmentContextDto,
  UpdateComplianceStakeholderDto,
  UpdateRequirementAssetLinksDto,
  UpdateSystemAssetDto,
  UpdateTechnicalMeasureDto,
} from '../dto/traceability-model.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai-systems/:aiSystemId')
export class ObligationsController {
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

  @Get('obligations')
  list(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.listObligations(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Get('traceability-model')
  traceabilityModel(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.getTraceabilityModel(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Post('system-assets')
  createSystemAsset(
    @Param('aiSystemId') aiSystemId: string,
    @Body() dto: CreateSystemAssetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createSystemAsset(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('system-assets/:assetId')
  updateSystemAsset(
    @Param('aiSystemId') aiSystemId: string,
    @Param('assetId') assetId: string,
    @Body() dto: UpdateSystemAssetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateSystemAsset(
      aiSystemId,
      assetId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Post('lifecycle-events')
  createLifecycleEvent(
    @Param('aiSystemId') aiSystemId: string,
    @Body() dto: CreateLifecycleEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createLifecycleEvent(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Post('stakeholders')
  createStakeholder(
    @Param('aiSystemId') aiSystemId: string,
    @Body() dto: CreateComplianceStakeholderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createComplianceStakeholder(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('stakeholders/:stakeholderId')
  updateStakeholder(
    @Param('aiSystemId') aiSystemId: string,
    @Param('stakeholderId') stakeholderId: string,
    @Body() dto: UpdateComplianceStakeholderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateComplianceStakeholder(
      aiSystemId,
      stakeholderId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Post('documentation-items')
  createDocumentationItem(
    @Param('aiSystemId') aiSystemId: string,
    @Body() dto: CreateDocumentationItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createDocumentationItem(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Get('findings')
  listFindings(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.listFindings(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Get('obligations/:obligationId/traceability')
  traceability(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.getObligationTraceability(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Post('findings')
  createFinding(
    @Param('aiSystemId') aiSystemId: string,
    @Body() dto: CreateFindingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createFinding(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('findings/:findingId')
  updateFinding(
    @Param('aiSystemId') aiSystemId: string,
    @Param('findingId') findingId: string,
    @Body() dto: UpdateFindingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateFinding(
      aiSystemId,
      findingId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('obligations/:obligationId')
  update(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: UpdateObligationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateObligation(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Put('obligations/:obligationId/assets')
  updateRequirementAssets(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: UpdateRequirementAssetLinksDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateRequirementAssetLinks(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Post('obligations/:obligationId/technical-measures')
  createTechnicalMeasure(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: CreateTechnicalMeasureDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createTechnicalMeasure(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('technical-measures/:measureId')
  updateTechnicalMeasure(
    @Param('aiSystemId') aiSystemId: string,
    @Param('measureId') measureId: string,
    @Body() dto: UpdateTechnicalMeasureDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateTechnicalMeasure(
      aiSystemId,
      measureId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('assessments/:assessmentId/context')
  updateAssessmentContext(
    @Param('aiSystemId') aiSystemId: string,
    @Param('assessmentId') assessmentId: string,
    @Body() dto: UpdateAssessmentContextDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateAssessmentContext(
      aiSystemId,
      assessmentId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Post('assessments/:assessmentId/finalize')
  finalizeAssessment(
    @Param('aiSystemId') aiSystemId: string,
    @Param('assessmentId') assessmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.finalizeAssessment(
      aiSystemId,
      assessmentId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Post('obligations/:obligationId/actions')
  createAction(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: CreateComplianceActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.createAction(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Patch('actions/:actionId')
  updateAction(
    @Param('aiSystemId') aiSystemId: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateComplianceActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.assessments.updateAction(
      aiSystemId,
      actionId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }
}
