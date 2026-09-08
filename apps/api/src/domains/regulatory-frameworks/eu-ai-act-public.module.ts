import { Module } from '@nestjs/common';
import { LlmModule } from '../../platform/ai/llm.module';
import { EuAiActPublicService } from './application/public-eu-ai-act/eu-ai-act-public.service';
import { EuAiActPublicController } from './presentation/controllers/eu-ai-act-public.controller';
import { EuAiActClassificationService } from './application/classification/eu-ai-act-classification.service';

@Module({
  imports: [LlmModule],
  controllers: [EuAiActPublicController],
  providers: [EuAiActPublicService, EuAiActClassificationService],
  exports: [EuAiActPublicService, EuAiActClassificationService],
})
export class EuAiActPublicModule {}
