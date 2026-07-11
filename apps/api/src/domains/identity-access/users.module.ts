import { Module } from '@nestjs/common';
import { UsersService } from './application/users/users.service';
import { UsersController } from './presentation/controllers/users.controller';
import { NotificationsModule } from '../../notifications/notifications.module';
import { EmailService } from '../../platform/email/email.service';
import { CompanyModule } from '../../company/company.module';

@Module({
  imports: [NotificationsModule, CompanyModule],
  providers: [UsersService, EmailService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
