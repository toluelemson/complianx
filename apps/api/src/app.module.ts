import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityAccessModule } from './domains/identity-access/identity-access.module';
import { ProjectsModule } from './projects/projects.module';
import { ReportingModule } from './domains/reporting/reporting.module';
import { LlmModule } from './llm/llm.module';
import { PdfModule } from './pdf/pdf.module';
import { TemplatesModule } from './templates/templates.module';
import { RemindersModule } from './reminders/reminders.module';
import { AutoSaveModule } from './auto-save/auto-save.module';
import { OrganizationsModule } from './domains/organizations/organizations.module';
import { EvidenceModule } from './domains/evidence/evidence.module';
import { AssessmentsModule } from './domains/assessments/assessments.module';
import { BillingController } from './billing/billing.controller';
import { BillingWebhookController } from './billing/billing.webhook.controller';
import { MonetizationService } from './monetization/monetization.service';
import { BillingService } from './billing/billing.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ContactModule } from './contact/contact.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EuAiActPublicModule } from './eu-ai-act-public/eu-ai-act-public.module';
import { ReviewApprovalModule } from './review-approval/review-approval.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityAccessModule,
    ProjectsModule,
    AssessmentsModule,
    EvidenceModule,
    ReportingModule,
    LlmModule,
    PdfModule,
    TemplatesModule,
    RemindersModule,
    AutoSaveModule,
    OrganizationsModule,
    NotificationsModule,
    ContactModule,
    AnalyticsModule,
    EuAiActPublicModule,
    ReviewApprovalModule,
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [MonetizationService, BillingService],
})
export class AppModule {}
