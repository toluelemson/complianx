import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyContextService } from './company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get()
  me(@Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.companyService.getCompanyForUser(req.user.userId, companyId);
  }

  @Post('create')
  create(@Request() req, @Body('name') name?: string) {
    return this.companyService.createCompanyForUser(req.user.userId, name);
  }

  @Patch()
  rename(@Request() req, @Body('name') name: string) {
    const companyId = this.resolveCompanyId(req);
    return this.companyService.updateCompanyName(
      req.user.userId,
      companyId,
      name,
    );
  }

  @Patch('members/:memberId/remove')
  removeMember(@Request() req, @Param('memberId') memberId: string) {
    const companyId = this.resolveCompanyId(req);
    return this.companyService.removeMember(
      req.user.userId,
      companyId,
      memberId,
    );
  }

  @Post('leave')
  leave(@Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.companyService.leaveCompany(req.user.userId, companyId);
  }
}
