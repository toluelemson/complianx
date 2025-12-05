import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailService } from '../notifications/email.service';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [NotificationsModule, CompanyModule],
  providers: [UsersService, EmailService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
