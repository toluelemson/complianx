import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../organizations/application/membership/company-context.service';
import { ProjectsService } from '../../ai-systems/application/projects/projects.service';
import { AuditService } from '../application/audit.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/audit-events')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly projects: ProjectsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Get()
  async list(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
    await this.projects.assertAccess(projectId, req.user.userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return this.audit.listProjectEvents(projectId, companyId);
  }
}
