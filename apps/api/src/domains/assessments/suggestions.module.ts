import { Module } from '@nestjs/common';
import { SuggestionsService } from './application/suggestions/suggestions.service';
import { SuggestionsController } from './presentation/controllers/suggestions.controller';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { CompanyModule } from '../organizations/company.module';

@Module({
  imports: [AiSystemsModule, CompanyModule],
  providers: [SuggestionsService],
  controllers: [SuggestionsController],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
