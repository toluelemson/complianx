import { Module } from '@nestjs/common';
import { LlmModule } from '../../platform/ai/llm.module';
import { EuAiActPublicService } from './application/public-eu-ai-act/eu-ai-act-public.service';
import { EuAiActPublicController } from './presentation/controllers/eu-ai-act-public.controller';

@Module({
  imports: [LlmModule],
  controllers: [EuAiActPublicController],
  providers: [EuAiActPublicService],
  exports: [EuAiActPublicService],
})
export class EuAiActPublicModule {}
