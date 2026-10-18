import { task, workflow } from '@aikirun/workflow';

export type ReportGenerationInput = {
  projectId: string;
  userId: string;
  documentTypes?: string[];
  operationId: string;
};

const generateReport = task({
  name: 'generate-report',
  async handler(input: ReportGenerationInput) {
    const apiUrl = required('API_INTERNAL_URL');
    const token = required('AIKI_SERVICE_TOKEN');
    const response = await fetch(
      new URL('/api/internal/aiki/report-generation', apiUrl),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      throw new Error(`Report generation API failed with ${response.status}`);
    }
    await response.text();
  },
});

export const reportGenerationV1 = workflow({ name: 'report-generation' }).v(
  '1.0.0',
  {
    async handler(run, input: ReportGenerationInput) {
      await generateReport.start(run, input);
    },
  },
);

function required(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}
