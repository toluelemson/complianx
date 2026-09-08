import { Module } from '@nestjs/common';
import { ProjectsController } from './presentation/controllers/projects.controller';
import { AiSystemsController } from './presentation/controllers/ai-systems.controller';
import { ProjectsService } from './application/projects/projects.service';
import { CompanyModule } from '../organizations/company.module';
import { RegulatoryFrameworksModule } from '../regulatory-frameworks/regulatory-frameworks.module';
import { ImportPublicResultService } from './application/import-public-result.service';

@Module({
  imports: [CompanyModule, RegulatoryFrameworksModule],
  controllers: [ProjectsController, AiSystemsController],
  providers: [ProjectsService, ImportPublicResultService],
  exports: [ProjectsService],
})
export class AiSystemsModule {}
