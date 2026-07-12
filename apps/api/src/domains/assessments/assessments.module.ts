import { Module } from '@nestjs/common';
import { SectionsModule } from './sections.module';
import { SuggestionsModule } from './suggestions.module';
import { TrustModule } from './trust.module';
import { AutoSaveModule } from './auto-save.module';

@Module({
  imports: [SectionsModule, SuggestionsModule, TrustModule, AutoSaveModule],
  exports: [SectionsModule, SuggestionsModule, TrustModule, AutoSaveModule],
})
export class AssessmentsModule {}
