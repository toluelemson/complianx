import { Module } from '@nestjs/common';
import { ProjectsController } from './presentation/controllers/projects.controller';
import { ProjectsService } from './application/projects/projects.service';
import { EmailService } from '../../platform/email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyModule } from '../organizations/company.module';
import { ReviewApprovalModule } from '../review-approval/review-approval.module';

@Module({
  imports: [NotificationsModule, CompanyModule, ReviewApprovalModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, EmailService],
  exports: [ProjectsService],
})
export class AiSystemsModule {}
