import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ReportGenerationJob = {
  projectId: string;
  userId: string;
  documentTypes?: string[];
  operationId: string;
};

@Injectable()
export class ReportGenerationQueueService {
  constructor(private readonly config: ConfigService) {}

  async enqueue(job: ReportGenerationJob) {
    const workerUrl = this.config.get<string>('AIKI_WORKER_URL')?.trim();
    const serviceToken = this.config.get<string>('AIKI_SERVICE_TOKEN')?.trim();
    if (!workerUrl || !serviceToken) {
      throw new ServiceUnavailableException({
        code: 'DOCUMENT_GENERATION_UNAVAILABLE',
        message: 'Document generation is temporarily unavailable.',
      });
    }

    let response: Response;
    try {
      response = await fetch(new URL('/jobs/report-generation', workerUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${serviceToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(job),
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'DOCUMENT_GENERATION_UNAVAILABLE',
        message: 'Document generation is temporarily unavailable.',
      });
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({
        code: 'DOCUMENT_GENERATION_UNAVAILABLE',
        message: 'Document generation is temporarily unavailable.',
      });
    }
    return (await response.json()) as { runId: string; operationId: string };
  }
}
