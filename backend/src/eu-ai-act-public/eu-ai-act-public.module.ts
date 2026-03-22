import { Module } from '@nestjs/common';
import { EuAiActPublicController } from './eu-ai-act-public.controller';
import { EuAiActPublicService } from './eu-ai-act-public.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [EuAiActPublicController],
  providers: [EuAiActPublicService],
  exports: [EuAiActPublicService],
})
export class EuAiActPublicModule {}
