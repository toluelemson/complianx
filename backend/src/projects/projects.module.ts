import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [NotificationsModule, CompanyModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, EmailService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
