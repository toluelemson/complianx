import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API security (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('rejects unauthenticated access to tenant billing data', () => {
    return request(app.getHttpServer())
      .get('/api/billing/plan')
      .expect(401);
  });

  it('rejects unauthenticated package verification', () => {
    return request(app.getHttpServer())
      .get('/api/ai-systems/project-1/reports/packages/package-1/verify')
      .expect(401);
  });

  it('rejects unauthenticated evidence downloads', () => {
    return request(app.getHttpServer())
      .get('/api/artifacts/artifact-1/download')
      .expect(401);
  });
});
