import { Injectable } from '@nestjs/common';
import type { ReportRenderer } from '../../application/report-generation/report-renderer.port';
import { renderDocumentHtml } from './templates';

@Injectable()
export class MarkdownReportRendererService implements ReportRenderer {
  renderHtml(title: string, markdown: string) {
    return renderDocumentHtml(title, markdown);
  }
}
