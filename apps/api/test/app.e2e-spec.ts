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

  it('authenticates the deterministic E2E fixture', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-user@example.invalid', password: 'e2e-test-password' })
      .expect(201);
    expect(response.body.token).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get('/api/billing/plan')
      .set('Authorization', `Bearer ${response.body.token}`)
      .set('x-company-id', 'e2e-company')
      .expect(200);
  });

  it('creates a tenant-scoped project with the authenticated fixture', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-user@example.invalid', password: 'e2e-test-password' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-company-id', 'e2e-company')
      .send({ name: `E2E project ${Date.now()}` })
      .expect(201)
      .expect(({ body }) => {
        expect(body.companyId).toBe('e2e-company');
      });
  });

  it('registers an AI system inside the active tenant', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-user@example.invalid', password: 'e2e-test-password' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/ai-systems')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-company-id', 'e2e-company')
      .send({ name: `E2E AI system ${Date.now()}` })
      .expect(201);
    expect(response.body.companyId).toBe('e2e-company');
  });

  it('runs preliminary EU AI Act classification for the system', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-user@example.invalid', password: 'e2e-test-password' })
      .expect(201);
    const system = await request(app.getHttpServer())
      .post('/api/ai-systems')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-company-id', 'e2e-company')
      .send({ name: `E2E classified system ${Date.now()}` })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/ai-systems/${system.body.id}/assessments/preliminary`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-company-id', 'e2e-company')
      .expect(201);
    const obligations = await request(app.getHttpServer())
      .get(`/api/ai-systems/${system.body.id}/obligations`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-company-id', 'e2e-company')
      .expect(200);
    expect(obligations.body).toEqual(expect.any(Array));
    const sections = await request(app.getHttpServer())
      .get(`/api/projects/${system.body.id}/sections`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('x-company-id', 'e2e-company')
      .expect(200);
    expect(sections.body).toEqual(expect.any(Array));
    if (sections.body[0]) {
      const upload = await request(app.getHttpServer())
        .post(`/api/projects/${system.body.id}/sections/${sections.body[0].id}/artifacts`)
        .set('Authorization', `Bearer ${login.body.token}`)
        .set('x-company-id', 'e2e-company')
        .attach('file', Buffer.from('E2E evidence'), 'evidence.txt')
        .expect(201);
      expect(upload.body.checksum).toEqual(expect.any(String));
      expect(upload.body.version).toBe(1);
    }
  });
});
