import { Module } from '@nestjs/common';
import { ArtifactsService } from './application/artifacts/artifacts.service';
import { ArtifactsController } from './presentation/controllers/artifacts.controller';
import { PrismaModule } from '../../platform/database/prisma.module';
import { ProjectsModule } from '../../projects/projects.module';
import { CompanyModule } from '../../company/company.module';
import { FilesModule } from '../../platform/files/files.module';

@Module({
  imports: [PrismaModule, ProjectsModule, CompanyModule, FilesModule],
  providers: [ArtifactsService],
  controllers: [ArtifactsController],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
