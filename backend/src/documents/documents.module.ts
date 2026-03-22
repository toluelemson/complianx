import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ProjectsModule } from '../projects/projects.module';
import { CompanyModule } from '../company/company.module';
import { LlmModule } from '../llm/llm.module';
import { PdfModule } from '../pdf/pdf.module';
import { ReadinessService } from '../generator/readiness.service';

@Module({
  imports: [ProjectsModule, CompanyModule, LlmModule, PdfModule],
  providers: [DocumentsService, ReadinessService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
