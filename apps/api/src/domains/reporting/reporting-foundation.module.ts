import { Module } from '@nestjs/common';
import { ReadinessService } from './application/readiness/readiness.service';
import { ReportCompositionService } from './application/report-generation/report-composition.service';
import { REPORT_RENDERER } from './application/report-generation/report-renderer.port';
import { MarkdownReportRendererService } from './infrastructure/rendering/markdown-report-renderer.service';

@Module({
  providers: [
    ReadinessService,
    ReportCompositionService,
    MarkdownReportRendererService,
    { provide: REPORT_RENDERER, useExisting: MarkdownReportRendererService },
  ],
  exports: [ReadinessService, ReportCompositionService],
})
export class ReportingFoundationModule {}
