import { Module } from '@nestjs/common';
import { GeneratorService } from './application/report-generation/generator.service';
import { GeneratorController } from './presentation/controllers/generator.controller';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { LlmModule } from '../../platform/ai/llm.module';
import { DocumentsModule } from '../evidence/documents.module';
import { PdfModule } from '../../platform/pdf/pdf.module';
import { MonetizationService } from '../subscriptions/application/monetization.service';
import { FilesModule } from '../../platform/files/files.module';
import { ReportingFoundationModule } from './reporting-foundation.module';

@Module({
  imports: [
    AiSystemsModule,
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
