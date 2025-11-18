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

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body('email') email: string) {
    return this.invitationsService.createInvitation(req.user, email);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req) {
    return this.invitationsService.listInvitations(req.user);
  }

  @Get(':token')
  getInvitation(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }
}
