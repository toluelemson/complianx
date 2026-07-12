import { Module } from '@nestjs/common';
import { SuggestionsService } from './application/suggestions/suggestions.service';
import { SuggestionsController } from './presentation/controllers/suggestions.controller';

@Module({
  providers: [SuggestionsService],
  controllers: [SuggestionsController],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
