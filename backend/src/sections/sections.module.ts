import { Module } from '@nestjs/common';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { ProjectsModule } from '../projects/projects.module';
import { LlmModule } from '../llm/llm.module';
import { EmailService } from '../notifications/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [ProjectsModule, LlmModule, NotificationsModule, CompanyModule],
  controllers: [SectionsController],
  providers: [SectionsService, EmailService],
  exports: [SectionsService],
})
export class SectionsModule {}
