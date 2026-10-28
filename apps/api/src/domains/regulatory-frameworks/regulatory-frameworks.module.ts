import { Module } from '@nestjs/common';
import { TemplatesService } from './application/templates.service';
import { TemplatesController } from './presentation/templates.controller';
import { EuAiActPublicModule } from './eu-ai-act-public.module';
import { PrismaModule } from '../../platform/database/prisma.module';
import { CompanyModule } from '../organizations/company.module';
import { PackLifecycleService } from './application/pack-lifecycle.service';
import { PackLifecycleController } from './presentation/pack-lifecycle.controller';

@Module({
  imports: [EuAiActPublicModule, PrismaModule, CompanyModule],
  providers: [TemplatesService, PackLifecycleService],
  controllers: [TemplatesController, PackLifecycleController],
  exports: [TemplatesService, EuAiActPublicModule, PackLifecycleService],
})
export class RegulatoryFrameworksModule {}
