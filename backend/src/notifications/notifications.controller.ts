import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Request() req, @Query('unreadOnly') unreadOnly?: string, @Query('limit') limit?: string) {
    return this.notifications.listForUser(
      req.user.userId,
      unreadOnly === 'true',
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('count')
  count(@Request() req) {
    return this.notifications.unreadCount(req.user.userId);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.notifications.markRead(req.user.userId, id);
  }

  @Post('read-all')
  markAll(@Request() req) {
    return this.notifications.markAllRead(req.user.userId);
  }
}

