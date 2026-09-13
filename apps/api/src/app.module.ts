import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './platform/database/prisma.module';
import { IdentityAccessModule } from './domains/identity-access/identity-access.module';
import { AiSystemsModule } from './domains/ai-systems/ai-systems.module';
import { ReportingModule } from './domains/reporting/reporting.module';
import { LlmModule } from './platform/ai/llm.module';
import { PdfModule } from './platform/pdf/pdf.module';
import { RegulatoryFrameworksModule } from './domains/regulatory-frameworks/regulatory-frameworks.module';
import { RemindersModule } from './domains/notifications/reminders.module';
import { OrganizationsModule } from './domains/organizations/organizations.module';
import { EvidenceModule } from './domains/evidence/evidence.module';
import { AssessmentsModule } from './domains/assessments/assessments.module';
import { SubscriptionsModule } from './domains/subscriptions/subscriptions.module';
import { NotificationsModule } from './domains/notifications/notifications.module';
import { ContactModule } from './domains/marketing/contact.module';
import { ReviewApprovalModule } from './domains/review-approval/review-approval.module';
import { AuditModule } from './domains/audit/audit.module';
import { validateEnvironment } from './platform/config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('RATE_LIMIT_TTL_MS'),
          limit: config.getOrThrow<number>('RATE_LIMIT_REQUESTS'),
        },
      ],
    }),
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
    OrganizationsModule,
    NotificationsModule,
    ContactModule,
    ReviewApprovalModule,
    AuditModule,
    SubscriptionsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
