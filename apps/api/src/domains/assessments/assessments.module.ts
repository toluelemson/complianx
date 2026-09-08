import { Module } from '@nestjs/common';
import { SectionsModule } from './sections.module';
import { SuggestionsModule } from './suggestions.module';
import { TrustModule } from './trust.module';
import { AutoSaveModule } from './auto-save.module';
import { RegulatoryFrameworksModule } from '../regulatory-frameworks/regulatory-frameworks.module';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { CompanyModule } from '../organizations/company.module';
import { AssessmentsController } from './presentation/controllers/assessments.controller';
import { AssessmentsService } from './application/classification/assessments.service';
import { ObligationsController } from './presentation/controllers/obligations.controller';

@Module({
  imports: [
    SectionsModule,
    SuggestionsModule,
    TrustModule,
    AutoSaveModule,
    RegulatoryFrameworksModule,
    AiSystemsModule,
    CompanyModule,
  ],
  controllers: [AssessmentsController, ObligationsController],
  providers: [AssessmentsService],
  exports: [
    AssessmentsService,
    SectionsModule,
    SuggestionsModule,
    TrustModule,
    AutoSaveModule,
  ],
})
export class AssessmentsModule {}
