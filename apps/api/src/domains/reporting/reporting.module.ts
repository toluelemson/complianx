import { Module } from '@nestjs/common';
import { GeneratorService } from './application/report-generation/generator.service';
import { GeneratorController } from './presentation/controllers/generator.controller';
import { ProjectsModule } from '../../projects/projects.module';
import { LlmModule } from '../../platform/ai/llm.module';
import { DocumentsModule } from '../evidence/documents.module';
import { PdfModule } from '../../platform/pdf/pdf.module';
import { MonetizationService } from '../../monetization/monetization.service';
import { FilesModule } from '../../platform/files/files.module';
import { ReportingFoundationModule } from './reporting-foundation.module';

@Module({
  imports: [
    ProjectsModule,
    LlmModule,
    DocumentsModule,
    PdfModule,
    FilesModule,
    ReportingFoundationModule,
  ],
  controllers: [GeneratorController],
  providers: [GeneratorService, MonetizationService],
})
export class ReportingModule {}
