import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';
import { ReadinessReportService } from '../../application/readiness-report/readiness-report.service';

@UseGuards(JwtAuthGuard)
@Controller('ai-systems/:aiSystemId/reports')
export class ReadinessReportController {
  constructor(
    private readonly reports: ReadinessReportService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
  }

  @Post('readiness')
  create(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reports.create(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Post('package')
  createPackage(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reports.createPackage(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Get()
  list(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reports.list(aiSystemId, req.user.userId, this.companyId(req));
  }

  @Get('packages')
  listPackages(
    @Param('aiSystemId') aiSystemId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reports.listPackages(
      aiSystemId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Get(':reportId')
  get(@Param('reportId') reportId: string, @Req() req: AuthenticatedRequest) {
    return this.reports.get(reportId, req.user.userId, this.companyId(req));
  }
}
