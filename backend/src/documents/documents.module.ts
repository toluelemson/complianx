import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ProjectsModule } from '../projects/projects.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [ProjectsModule, CompanyModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
