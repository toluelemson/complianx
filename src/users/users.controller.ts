import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  ForbiddenException,
  Request,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateRoleDto } from './dto/update-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  private ensureAdmin(req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get()
  async list(@Request() req) {
    this.ensureAdmin(req);
    return this.usersService.listByCompany(req.user.companyId);
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Request() req,
  ) {
    this.ensureAdmin(req);
    return this.usersService.updateRole({
      targetUserId: id,
      role: dto.role,
      companyId: req.user.companyId,
    });
  }

  // Non-admin users can request reviewer role; not auto-granted, just notifies admins
  @Post('request-reviewer')
  async requestReviewer(@Request() req) {
    const { userId, companyId, email } = req.user || {};
    if (!userId || !companyId) {
      throw new ForbiddenException('Invalid user');
    }
    const admins = await this.usersService.listAdminsByCompany(companyId);
    const link = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/company`;
    await Promise.all(
      admins.map(async (admin) => {
        await this.notifications.create({
          userId: admin.id,
          title: 'Reviewer role requested',
          body: `${email ?? 'A user'} requested reviewer access.`,
          type: 'role_request',
          meta: { requesterId: userId },
        });
        await this.email.sendReminder(
          admin.email,
          'Reviewer role requested',
          `${email ?? 'A user'} requested reviewer access.\n\nManage roles: ${link}`,
        );
      }),
    );
    return { ok: true };
  }
}
