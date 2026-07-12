import { Module } from '@nestjs/common';
import { DocumentsService } from './application/documents/documents.service';
import { DocumentsController } from './presentation/controllers/documents.controller';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { CompanyModule } from '../organizations/company.module';
import { LlmModule } from '../../platform/ai/llm.module';
import { PdfModule } from '../../platform/pdf/pdf.module';
import { FilesModule } from '../../platform/files/files.module';
import { ReportingFoundationModule } from '../reporting/reporting-foundation.module';

@Module({
  imports: [
    AiSystemsModule,
    CompanyModule,
    LlmModule,
    PdfModule,
    FilesModule,
    ReportingFoundationModule,
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
