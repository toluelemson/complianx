import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { SectionsModule } from './sections/sections.module';
import { DocumentsModule } from './documents/documents.module';
import { GeneratorModule } from './generator/generator.module';
import { LlmModule } from './llm/llm.module';
import { PdfModule } from './pdf/pdf.module';
import { TemplatesModule } from './templates/templates.module';
import { RemindersModule } from './reminders/reminders.module';
import { AutoSaveModule } from './auto-save/auto-save.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { CompanyModule } from './company/company.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { TrustModule } from './trust/trust.module';
import { BillingController } from './billing/billing.controller';
import { BillingWebhookController } from './billing/billing.webhook.controller';
import { MonetizationService } from './monetization/monetization.service';
import { BillingService } from './billing/billing.service';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    SectionsModule,
    DocumentsModule,
    GeneratorModule,
    LlmModule,
    PdfModule,
    TemplatesModule,
    RemindersModule,
    AutoSaveModule,
    SuggestionsModule,
    CompanyModule,
    InvitationsModule,
    ArtifactsModule,
    TrustModule,
    NotificationsModule,
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [MonetizationService, BillingService],
})
export class AppModule {}
