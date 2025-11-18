import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(@Param('projectId') projectId: string, @Request() req) {
    return this.remindersService.list(projectId, req.user.userId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() dto: CreateReminderDto,
  ) {
    return this.remindersService.create(projectId, req.user.userId, dto);
  }

  @Patch(':reminderId')
  update(
    @Param('projectId') projectId: string,
    @Param('reminderId') reminderId: string,
    @Request() req,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(
      projectId,
      reminderId,
      req.user.userId,
      dto,
    );
  }
}
