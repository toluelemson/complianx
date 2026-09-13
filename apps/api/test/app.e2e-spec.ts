import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/platform/database/prisma.service';
import {
  FILE_STORAGE,
  type FileStorage,
} from '../src/platform/files/file-storage.port';
import bcrypt from 'bcrypt';
import { promises as fs } from 'node:fs';

process.env.MONETIZATION_ENABLED = 'false';

describe('API security (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to tenant billing data', () => {
    return request(app.getHttpServer()).get('/api/billing/plan').expect(401);
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
      .send({
        email: 'e2e-user@example.invalid',
        password: 'e2e-test-password',
      })
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
      .send({
        email: 'e2e-user@example.invalid',
        password: 'e2e-test-password',
      })
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
      .send({
        email: 'e2e-user@example.invalid',
        password: 'e2e-test-password',
      })
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
      .send({
        email: 'e2e-user@example.invalid',
        password: 'e2e-test-password',
      })
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
        .post(
          `/api/projects/${system.body.id}/sections/${sections.body[0].id}/artifacts`,
        )
        .set('Authorization', `Bearer ${login.body.token}`)
        .set('x-company-id', 'e2e-company')
        .attach('file', Buffer.from('E2E evidence'), 'evidence.txt')
        .expect(201);
      expect(upload.body.checksum).toEqual(expect.any(String));
      expect(upload.body.version).toBe(1);
      await request(app.getHttpServer())
        .patch(`/api/artifacts/${upload.body.id}/review`)
        .set('Authorization', `Bearer ${login.body.token}`)
        .set('x-company-id', 'e2e-company')
        .send({ status: 'APPROVED', comment: 'E2E evidence review' })
        .expect(200);
      if (obligations.body[0]) {
        await request(app.getHttpServer())
          .post(
            `/api/ai-systems/${system.body.id}/obligations/${obligations.body[0].id}/evidence`,
          )
          .set('Authorization', `Bearer ${login.body.token}`)
          .set('x-company-id', 'e2e-company')
          .send({ artifactId: upload.body.id, linkType: 'SUPPORTING' })
          .expect(201);
        const traceability = await request(app.getHttpServer())
          .get(
            `/api/ai-systems/${system.body.id}/obligations/${obligations.body[0].id}/traceability`,
          )
          .set('Authorization', `Bearer ${login.body.token}`)
          .set('x-company-id', 'e2e-company')
          .expect(200);
        expect(traceability.body.evidence).toEqual(expect.any(Array));
      }
    }
  });

  it('completes and protects the compliance-package golden path', async () => {
    const prisma = app.get(PrismaService);
    const storage = app.get<FileStorage>(FILE_STORAGE);
    const adminId = '10000000-0000-4000-8000-000000000001';
    const memberId = '10000000-0000-4000-8000-000000000002';
    const outsiderId = '10000000-0000-4000-8000-000000000003';
    const reviewerId = '10000000-0000-4000-8000-000000000004';
    const otherCompanyId = 'e2e-other-company';
    const passwordHash = await bcrypt.hash('e2e-test-password', 4);
    await prisma.company.upsert({
      where: { id: otherCompanyId },
      update: {},
      create: { id: otherCompanyId, name: 'E2E Other Company' },
    });
    for (const fixture of [
      {
        id: adminId,
        email: 'e2e-admin@example.invalid',
        companyId: 'e2e-company',
        role: 'ADMIN' as const,
      },
      {
        id: memberId,
        email: 'e2e-member@example.invalid',
        companyId: 'e2e-company',
        role: 'USER' as const,
      },
      {
        id: outsiderId,
        email: 'e2e-outsider@example.invalid',
        companyId: otherCompanyId,
        role: 'ADMIN' as const,
      },
      {
        id: reviewerId,
        email: 'e2e-reviewer@example.invalid',
        companyId: 'e2e-company',
        role: 'REVIEWER' as const,
      },
    ]) {
      await prisma.user.upsert({
        where: { id: fixture.id },
        update: {
          email: fixture.email,
          passwordHash,
          companyId: fixture.companyId,
          defaultCompanyId: fixture.companyId,
          role: fixture.role,
          emailVerified: true,
        },
        create: {
          id: fixture.id,
          email: fixture.email,
          passwordHash,
          companyId: fixture.companyId,
          defaultCompanyId: fixture.companyId,
          role: fixture.role,
          emailVerified: true,
        },
      });
      await prisma.userCompany.upsert({
        where: {
          userId_companyId: {
            userId: fixture.id,
            companyId: fixture.companyId,
          },
        },
        update: { role: fixture.role },
        create: {
          userId: fixture.id,
          companyId: fixture.companyId,
          role: fixture.role,
        },
      });
    }

    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: 'e2e-test-password' })
          .expect(201)
      ).body.token as string;
    const adminToken = await login('e2e-admin@example.invalid');
    const memberToken = await login('e2e-member@example.invalid');
    const outsiderToken = await login('e2e-outsider@example.invalid');
    const reviewerToken = await login('e2e-reviewer@example.invalid');
    const authenticated = (token: string, companyId = 'e2e-company') => ({
      Authorization: `Bearer ${token}`,
      'x-company-id': companyId,
    });

    const project = await request(app.getHttpServer())
      .post('/api/ai-systems')
      .set(authenticated(adminToken))
      .send({
        name: `Golden path ${Date.now()}`,
        industry: 'software',
        description: 'Deterministic E2E AI system',
        businessPurpose: 'Compliance workflow verification',
        intendedUse: 'Assist compliance reviewers',
        intendedUsers: 'Compliance staff',
        affectedPersons: 'Employees',
        deploymentGeography: 'EU',
        operatorRoles: ['provider'],
        lifecycleStage: 'PRODUCTION',
        responsibleOwner: 'E2E Admin',
        providerOrDeveloper: 'Neuraldocx',
        generatesContent: false,
        useCaseIndicators: [],
      })
      .expect(201);

    const classification = await request(app.getHttpServer())
      .post(`/api/ai-systems/${project.body.id}/assessments/preliminary`)
      .set(authenticated(adminToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/api/ai-systems/${project.body.id}/assessments/classifications/${classification.body.id}/review`,
      )
      .set(authenticated(adminToken))
      .send({ status: 'REVIEWED', reason: 'Human classification review' })
      .expect(201);

    const sectionsResponse = await request(app.getHttpServer())
      .get(`/api/projects/${project.body.id}/sections`)
      .set(authenticated(adminToken))
      .expect(200);
    const completeContent = {
      purpose: 'Documented purpose',
      intendedUsers: 'Compliance staff',
      deploymentContext: 'EU production',
      modelType: 'Rules and language model',
      trainingData: 'Documented data sources',
      metrics: 'Quality metrics',
      dataSources: 'Approved sources',
      qualityChecks: 'Validated checks',
      privacy: 'Privacy review',
      risks: 'Documented risks',
      likelihood: 'Medium',
      impact: 'Medium',
      roles: 'Assigned reviewers',
      escalations: 'Escalation procedure',
      monitoringPlan: 'Continuous monitoring',
      maintenance: 'Quarterly maintenance',
    };
    const sections = sectionsResponse.body.length
      ? sectionsResponse.body
      : [
          (
            await request(app.getHttpServer())
              .post(`/api/projects/${project.body.id}/sections`)
              .set(authenticated(adminToken))
              .send({ name: 'system_overview', content: completeContent })
              .expect(201)
          ).body,
        ];
    for (const section of sections) {
      await request(app.getHttpServer())
        .put(`/api/projects/${project.body.id}/sections/${section.id}`)
        .set(authenticated(adminToken))
        .send({ content: completeContent })
        .expect(200);
    }

    const evidence = await request(app.getHttpServer())
      .post(
        `/api/projects/${project.body.id}/sections/${sections[0].id}/artifacts`,
      )
      .set(authenticated(adminToken))
      .attach('file', Buffer.from('Reviewed golden-path evidence'), {
        filename: 'evidence.txt',
        contentType: 'text/plain',
      })
      .expect(201);
    await prisma.project.update({
      where: { id: project.body.id },
      data: { reviewerId },
    });
    await request(app.getHttpServer())
      .patch(`/api/artifacts/${evidence.body.id}/review`)
      .set(authenticated(reviewerToken))
      .send({ status: 'APPROVED', comment: 'Human evidence review' })
      .expect(200);

    const obligations = await request(app.getHttpServer())
      .get(`/api/ai-systems/${project.body.id}/obligations`)
      .set(authenticated(adminToken))
      .expect(200);
    for (const obligation of obligations.body) {
      await request(app.getHttpServer())
        .post(
          `/api/ai-systems/${project.body.id}/obligations/${obligation.id}/evidence`,
        )
        .set(authenticated(adminToken))
        .send({ artifactId: evidence.body.id, linkType: 'SUPPORTING' })
        .expect(201);
      await request(app.getHttpServer())
        .patch(
          `/api/ai-systems/${project.body.id}/obligations/${obligation.id}`,
        )
        .set(authenticated(adminToken))
        .send({ status: 'COMPLETE', approvalState: 'APPROVED' })
        .expect(200);
    }

    const documentName = `${project.body.id}-approved-e2e.pdf`;
    await storage.write(
      'documents',
      documentName,
      Buffer.from('%PDF-1.7\nE2E'),
    );
    await prisma.document.create({
      data: {
        projectId: project.body.id,
        type: 'technical_documentation',
        url: documentName,
        approvalState: 'APPROVED',
        lifecycleStatus: 'CURRENT',
        provenanceStatus: 'COMPLETE',
      },
    });

    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/submit`)
      .set(authenticated(adminToken))
      .send({
        reviewerId,
        approverId: adminId,
        note: 'Ready for review',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/start-review`)
      .set(authenticated(reviewerToken))
      .send({ note: 'Review started' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/request-changes`)
      .set(authenticated(reviewerToken))
      .send({ note: 'Review rejected pending changes' })
      .expect(201);
    const rejectedReview = await request(app.getHttpServer())
      .post(`/api/ai-systems/${project.body.id}/reports/package`)
      .set(authenticated(adminToken))
      .expect(400);
    expect(rejectedReview.body.gaps).toEqual(
      expect.arrayContaining(['Project approval is outstanding']),
    );
    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/resubmit`)
      .set(authenticated(adminToken))
      .send({ note: 'Review changes addressed' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/start-review`)
      .set(authenticated(reviewerToken))
      .send({ note: 'Review restarted' })
      .expect(201);
    for (const section of sections) {
      await request(app.getHttpServer())
        .post(`/api/sections/${section.id}/workflow/start-review`)
        .set(authenticated(reviewerToken))
        .send({ note: 'Section reviewed' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sections/${section.id}/workflow/approve`)
        .set(authenticated(reviewerToken))
        .send({ signature: 'E2E Reviewer', note: 'Section approved' })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/approve`)
      .set(authenticated(memberToken))
      .send({ signature: 'Unauthorized Member' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.body.id}/workflow/approve`)
      .set(authenticated(adminToken))
      .send({ signature: 'E2E Approver', note: 'Project approved' })
      .expect(201);

    const compliancePackage = await request(app.getHttpServer())
      .post(`/api/ai-systems/${project.body.id}/reports/package`)
      .set(authenticated(adminToken))
      .expect(201);
    expect(compliancePackage.body.status).toBe('COMPLETE');
    const verification = await request(app.getHttpServer())
      .get(
        `/api/ai-systems/${project.body.id}/reports/packages/${compliancePackage.body.id}/verify`,
      )
      .set(authenticated(adminToken))
      .expect(200);
    expect(verification.body).toMatchObject({
      valid: true,
      manifestValid: true,
      archiveValid: true,
    });
    const download = await request(app.getHttpServer())
      .get(
        `/api/ai-systems/${project.body.id}/reports/packages/${compliancePackage.body.id}/download`,
      )
      .set(authenticated(adminToken))
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect('Content-Type', /application\/zip/);
    expect(download.body.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get(
        `/api/ai-systems/${project.body.id}/reports/packages/${compliancePackage.body.id}/download`,
      )
      .expect(401);
    for (const action of ['verify', 'download']) {
      await request(app.getHttpServer())
        .get(
          `/api/ai-systems/${project.body.id}/reports/packages/${compliancePackage.body.id}/${action}`,
        )
        .set(authenticated(outsiderToken, otherCompanyId))
        .expect(403);
    }

    const packageRecord = await prisma.compliancePackage.findUniqueOrThrow({
      where: { id: compliancePackage.body.id },
    });
    const archivePath = storage.resolve('packages', packageRecord.archiveFile!);
    const originalArchive = await fs.readFile(archivePath);
    await fs.writeFile(
      archivePath,
      Buffer.concat([originalArchive, Buffer.from('tampered')]),
    );
    const archiveTampered = await request(app.getHttpServer())
      .get(
        `/api/ai-systems/${project.body.id}/reports/packages/${compliancePackage.body.id}/verify`,
      )
      .set(authenticated(adminToken))
      .expect(200);
    expect(archiveTampered.body).toMatchObject({
      valid: false,
      archiveValid: false,
    });
    await fs.writeFile(archivePath, originalArchive);

    await prisma.compliancePackage.update({
      where: { id: compliancePackage.body.id },
      data: { manifest: { tampered: true } },
    });
    const manifestTampered = await request(app.getHttpServer())
      .get(
        `/api/ai-systems/${project.body.id}/reports/packages/${compliancePackage.body.id}/verify`,
      )
      .set(authenticated(adminToken))
      .expect(200);
    expect(manifestTampered.body).toMatchObject({
      valid: false,
      manifestValid: false,
    });

    await prisma.obligationEvidence.deleteMany({
      where: { obligation: { projectId: project.body.id } },
    });
    const missingEvidence = await request(app.getHttpServer())
      .post(`/api/ai-systems/${project.body.id}/reports/package`)
      .set(authenticated(adminToken))
      .expect(400);
    expect(missingEvidence.body.message).toBe(
      'Compliance package generation is blocked',
    );
    expect(missingEvidence.body.gaps).toEqual(
      expect.arrayContaining([
        expect.stringContaining('lacks valid supporting evidence'),
      ]),
    );
  });
});
