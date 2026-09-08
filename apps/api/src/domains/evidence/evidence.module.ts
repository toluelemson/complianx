import { Module } from '@nestjs/common';
import { ArtifactsModule } from './artifacts.module';
import { DocumentsModule } from './documents.module';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { CompanyModule } from '../organizations/company.module';
import { ObligationEvidenceService } from './application/obligation-evidence/obligation-evidence.service';
import { ObligationEvidenceController } from './presentation/controllers/obligation-evidence.controller';

@Module({
  imports: [ArtifactsModule, DocumentsModule, AiSystemsModule, CompanyModule],
  controllers: [ObligationEvidenceController],
  providers: [ObligationEvidenceService],
  exports: [ArtifactsModule, DocumentsModule],
})
export class EvidenceModule {}
