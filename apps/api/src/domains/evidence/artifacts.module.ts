import { Module } from '@nestjs/common';
import { ArtifactsService } from './application/artifacts/artifacts.service';
import { ArtifactsController } from './presentation/controllers/artifacts.controller';
import { PrismaModule } from '../../platform/database/prisma.module';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { CompanyModule } from '../organizations/company.module';
import { FilesModule } from '../../platform/files/files.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AiSystemsModule,
    CompanyModule,
    FilesModule,
    AuditModule,
  ],
  providers: [ArtifactsService],
  controllers: [ArtifactsController],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
