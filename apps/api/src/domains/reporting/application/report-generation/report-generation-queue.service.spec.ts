import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportGenerationQueueService } from './report-generation-queue.service';

describe('ReportGenerationQueueService', () => {
  const workerUrl = 'http://aiki-worker:9850';
  const serviceToken = 'test-service-token';
  const job = {
    projectId: 'project-1',
    userId: 'user-1',
    documentTypes: ['model_card'],
    operationId: 'operation-1',
  };
  const accepted = { runId: 'run-1', operationId: job.operationId };
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(accepted, { status: 202 }));
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['', ''],
    [workerUrl, ''],
    ['', serviceToken],
  ])(
    'returns 503 when the worker configuration is incomplete',
    async (url, token) => {
      const queue = new ReportGenerationQueueService(
        new ConfigService({ AIKI_WORKER_URL: url, AIKI_SERVICE_TOKEN: token }),
      );

      await expect(queue.enqueue(job)).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        response: { code: 'DOCUMENT_GENERATION_UNAVAILABLE' },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('queues the job with the shared token when both settings are present', async () => {
    const queue = new ReportGenerationQueueService(
      new ConfigService({
        AIKI_WORKER_URL: workerUrl,
        AIKI_SERVICE_TOKEN: serviceToken,
      }),
    );

    await expect(queue.enqueue(job)).resolves.toEqual(accepted);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/jobs/report-generation', workerUrl),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${serviceToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(job),
      },
    );
  });
});
