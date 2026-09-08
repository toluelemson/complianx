import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';
import { ObligationEvidenceService } from '../../application/obligation-evidence/obligation-evidence.service';
import { LinkObligationEvidenceDto } from '../dto/link-obligation-evidence.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai-systems/:aiSystemId/obligations/:obligationId/evidence')
export class ObligationEvidenceController {
  constructor(
    private readonly evidence: ObligationEvidenceService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
  }

  @Get()
  list(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.evidence.list(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
    );
  }

  @Post()
  link(
    @Param('aiSystemId') aiSystemId: string,
    @Param('obligationId') obligationId: string,
    @Body() dto: LinkObligationEvidenceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.evidence.link(
      aiSystemId,
      obligationId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  @Delete(':linkId')
  unlink(@Param('linkId') linkId: string, @Req() req: AuthenticatedRequest) {
    return this.evidence.unlink(linkId, req.user.userId, this.companyId(req));
  }
}
