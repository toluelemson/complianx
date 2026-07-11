export const REPORT_RENDERER = Symbol('REPORT_RENDERER');

export interface ReportRenderer {
  renderHtml(title: string, markdown: string): string;
}
