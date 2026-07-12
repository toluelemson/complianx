import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../platform/auth/authenticated-request.type';
import { NotificationsService } from '../application/notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.listForUser(
      req.user.userId,
      unreadOnly === 'true',
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('count')
  count(@Req() req: AuthenticatedRequest) {
    return this.notifications.unreadCount(req.user.userId);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notifications.markRead(req.user.userId, id);
  }

  @Post('read-all')
  markAll(@Req() req: AuthenticatedRequest) {
    return this.notifications.markAllRead(req.user.userId);
  }
}
