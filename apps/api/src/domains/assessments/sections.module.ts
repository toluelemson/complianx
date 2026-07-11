import { Module } from '@nestjs/common';
import { SectionsController } from './presentation/controllers/sections.controller';
import { SectionsService } from './application/sections/sections.service';
import { ProjectsModule } from '../../projects/projects.module';
import { LlmModule } from '../../platform/ai/llm.module';
import { EmailService } from '../../platform/email/email.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { CompanyModule } from '../../company/company.module';
import { MonetizationService } from '../../monetization/monetization.service';
import { ReviewApprovalModule } from '../review-approval/review-approval.module';

@Module({
  imports: [
    ProjectsModule,
    LlmModule,
    NotificationsModule,
    CompanyModule,
    ReviewApprovalModule,
  ],
  controllers: [SectionsController],
  providers: [SectionsService, EmailService, MonetizationService],
  exports: [SectionsService],
})
export class SectionsModule {}
