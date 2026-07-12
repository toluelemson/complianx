import { Module } from '@nestjs/common';
import { ArtifactsModule } from './artifacts.module';
import { DocumentsModule } from './documents.module';

@Module({
  imports: [ArtifactsModule, DocumentsModule],
  exports: [ArtifactsModule, DocumentsModule],
})
export class EvidenceModule {}
