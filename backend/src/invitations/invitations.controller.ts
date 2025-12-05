import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyContextService } from '../company/company-context.service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body('email') email: string) {
    const companyId = this.resolveCompanyId(req);
    return this.invitationsService.createInvitation(req.user, email, companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.invitationsService.listInvitations(req.user, companyId);
  }

  @Get(':token')
  getInvitation(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }
}
