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
import { RemindersService } from '../application/reminders.service';
import { JwtAuthGuard } from '../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../platform/auth/authenticated-request.type';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { CompanyContextService } from '../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/reminders')
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.remindersService.list(projectId, req.user.userId, this.companyId(req));
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReminderDto,
  ) {
    return this.remindersService.create(projectId, req.user.userId, this.companyId(req), dto);
  }

  @Patch(':reminderId')
  update(
    @Param('projectId') projectId: string,
    @Param('reminderId') reminderId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(
      projectId,
      reminderId,
      req.user.userId,
      this.companyId(req),
      dto,
    );
  }

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      req.headers?.['x-company-id'] as string | undefined,
    ).companyId;
  }
}
