import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './platform/database/prisma.module';
import { IdentityAccessModule } from './domains/identity-access/identity-access.module';
import { AiSystemsModule } from './domains/ai-systems/ai-systems.module';
import { ReportingModule } from './domains/reporting/reporting.module';
import { LlmModule } from './platform/ai/llm.module';
import { PdfModule } from './platform/pdf/pdf.module';
import { RegulatoryFrameworksModule } from './domains/regulatory-frameworks/regulatory-frameworks.module';
import { RemindersModule } from './domains/notifications/reminders.module';
import { AutoSaveModule } from './auto-save/auto-save.module';
import { OrganizationsModule } from './domains/organizations/organizations.module';
import { EvidenceModule } from './domains/evidence/evidence.module';
import { AssessmentsModule } from './domains/assessments/assessments.module';
import { SubscriptionsModule } from './domains/subscriptions/subscriptions.module';
import { NotificationsModule } from './domains/notifications/notifications.module';
import { ContactModule } from './contact/contact.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EuAiActPublicModule } from './eu-ai-act-public/eu-ai-act-public.module';
import { ReviewApprovalModule } from './domains/review-approval/review-approval.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityAccessModule,
    AiSystemsModule,
    AssessmentsModule,
    EvidenceModule,
    ReportingModule,
    LlmModule,
    PdfModule,
    RegulatoryFrameworksModule,
    RemindersModule,
    AutoSaveModule,
    OrganizationsModule,
    NotificationsModule,
    ContactModule,
    AnalyticsModule,
    EuAiActPublicModule,
    ReviewApprovalModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
