import { Module } from '@nestjs/common';
import { DocumentsService } from './application/documents/documents.service';
import { DocumentsController } from './presentation/controllers/documents.controller';
import { ProjectsModule } from '../../projects/projects.module';
import { CompanyModule } from '../../company/company.module';
import { LlmModule } from '../../platform/ai/llm.module';
import { PdfModule } from '../../platform/pdf/pdf.module';
import { ReadinessService } from '../../generator/readiness.service';
import { FilesModule } from '../../platform/files/files.module';

@Module({
  imports: [ProjectsModule, CompanyModule, LlmModule, PdfModule, FilesModule],
  providers: [DocumentsService, ReadinessService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
