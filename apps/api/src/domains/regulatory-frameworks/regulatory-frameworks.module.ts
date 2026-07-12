import { Module } from '@nestjs/common';
import { TemplatesService } from './application/templates.service';
import { TemplatesController } from './presentation/templates.controller';
import { EuAiActPublicModule } from './eu-ai-act-public.module';

@Module({
  imports: [EuAiActPublicModule],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService, EuAiActPublicModule],
})
export class RegulatoryFrameworksModule {}
