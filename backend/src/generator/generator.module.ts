import { Module } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { GeneratorController } from './generator.controller';
import { ProjectsModule } from '../projects/projects.module';
import { LlmModule } from '../llm/llm.module';
import { DocumentsModule } from '../documents/documents.module';
import { PdfModule } from '../pdf/pdf.module';
import { MonetizationService } from '../monetization/monetization.service';

@Module({
  imports: [ProjectsModule, LlmModule, DocumentsModule, PdfModule],
  controllers: [GeneratorController],
  providers: [GeneratorService, MonetizationService],
})
export class GeneratorModule {}
