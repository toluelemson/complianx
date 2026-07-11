import { Inject, Injectable } from '@nestjs/common';
import { REPORT_RENDERER, type ReportRenderer } from './report-renderer.port';
import { mergeSections } from './merge-sections';

@Injectable()
export class ReportCompositionService {
  constructor(
    @Inject(REPORT_RENDERER) private readonly renderer: ReportRenderer,
  ) {}

  mergeSections(sections: Parameters<typeof mergeSections>[0]) {
    return mergeSections(sections);
  }

  renderHtml(title: string, markdown: string) {
    return this.renderer.renderHtml(title, markdown);
  }
}
