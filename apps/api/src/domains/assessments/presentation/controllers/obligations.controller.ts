import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
