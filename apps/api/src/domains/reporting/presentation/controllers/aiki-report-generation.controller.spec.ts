import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeneratorService } from '../../application/report-generation/generator.service';
import { AikiReportGenerationController } from './aiki-report-generation.controller';

describe('AikiReportGenerationController', () => {
  const workerUrl = 'http://aiki-worker:9850';
  const serviceToken = 'test-service-token';
  const job = {
    projectId: 'project-1',
    userId: 'user-1',
    documentTypes: ['model_card'],
    operationId: 'operation-1',
  };
  const generator = { generate: jest.fn() };

  const controller = (url: string, token: string) =>
    new AikiReportGenerationController(
      new ConfigService({ AIKI_WORKER_URL: url, AIKI_SERVICE_TOKEN: token }),
      generator as unknown as GeneratorService,
    );

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['', ''],
    [workerUrl, ''],
    ['', serviceToken],
  ])(
    'rejects callbacks when the worker configuration is incomplete',
    async (url, token) => {
      await expect(
        controller(url, token).generate(`Bearer ${serviceToken}`, job),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(generator.generate).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    'Bearer wrong-token',
    `Bearer é${serviceToken.slice(1)}`,
  ])(
    'rejects a callback without a matching service token',
    async (authorization) => {
      await expect(
        controller(workerUrl, serviceToken).generate(authorization, job),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(generator.generate).not.toHaveBeenCalled();
    },
  );

  it('passes the job to the generator when the worker is authenticated', async () => {
    await controller(workerUrl, serviceToken).generate(
      `Bearer ${serviceToken}`,
      job,
    );

    expect(generator.generate).toHaveBeenCalledWith(
      job.projectId,
      job.userId,
      job.documentTypes,
      job.operationId,
    );
  });
});
