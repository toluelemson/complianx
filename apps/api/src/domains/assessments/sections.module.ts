import { Module } from '@nestjs/common';
import { SectionsController } from './presentation/controllers/sections.controller';
import { SectionsService } from './application/sections/sections.service';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { LlmModule } from '../../platform/ai/llm.module';
import { EmailService } from '../../platform/email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyModule } from '../organizations/company.module';
import { MonetizationService } from '../subscriptions/application/monetization.service';
import { ReviewApprovalModule } from '../review-approval/review-approval.module';

@Module({
  imports: [
    AiSystemsModule,
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
