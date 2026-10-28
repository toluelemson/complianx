import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../organizations/application/membership/company-context.service';
import { PackLifecycleService } from '../application/pack-lifecycle.service';

@UseGuards(JwtAuthGuard)
@Controller('regulatory-packs')
export class PackLifecycleController {
  constructor(
    private readonly packs: PackLifecycleService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
  }

  @Post(':packId/publish')
  publish(@Param('packId') packId: string, @Req() req: AuthenticatedRequest) {
    return this.packs.publish(packId, req.user, this.companyId(req));
  }

  @Post(':packId/deprecate')
  deprecate(@Param('packId') packId: string, @Req() req: AuthenticatedRequest) {
    return this.packs.deprecate(packId, req.user, this.companyId(req));
  }
}
