import { Module } from '@nestjs/common';
import { SectionsModule } from './sections.module';
import { SuggestionsModule } from './suggestions.module';
import { TrustModule } from './trust.module';

@Module({
  imports: [SectionsModule, SuggestionsModule, TrustModule],
  exports: [SectionsModule, SuggestionsModule, TrustModule],
})
export class AssessmentsModule {}
