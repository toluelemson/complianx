import { Module } from '@nestjs/common';
import { ProjectsController } from './presentation/controllers/projects.controller';
import { ProjectsService } from './application/projects/projects.service';
import { CompanyModule } from '../organizations/company.module';

@Module({
  imports: [CompanyModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class AiSystemsModule {}
