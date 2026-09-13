import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AssessmentsService } from '../../src/domains/assessments/application/classification/assessments.service';
import { ProjectsService } from '../../src/domains/ai-systems/application/projects/projects.service';
import { AuditService } from '../../src/domains/audit/application/audit.service';
import { ReadinessReportService } from '../../src/domains/reporting/application/readiness-report/readiness-report.service';
import { LocalFileStorageService } from '../../src/platform/files/local-file-storage.service';
import { EvidenceExpiryScheduler } from '../../src/domains/notifications/application/evidence-expiry.scheduler';
import { NotificationsService } from '../../src/domains/notifications/application/notifications.service';
import { EuAiActClassificationService } from '../../src/domains/regulatory-frameworks/application/classification/eu-ai-act-classification.service';
import { PackLifecycleService } from '../../src/domains/regulatory-frameworks/application/pack-lifecycle.service';

// Deliberately fail instead of skipping when the dedicated test DB is not supplied.
const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  !url.pathname.endsWith('_test')
)
  throw new Error('A dedicated local *_test database is required');
const prisma = new PrismaClient();
const projects = new ProjectsService(prisma as never);
const audit = new AuditService(prisma as never);
const assessments = new AssessmentsService(
  prisma as never,
  projects,
  new EuAiActClassificationService(prisma as never),
  audit,
);
let storage: LocalFileStorageService;
let reports: ReadinessReportService;

async function fixture() {
  const suffix = randomUUID();
  const [owner, reviewer, outsider, member] = await Promise.all(
    ['owner', 'reviewer', 'outsider', 'member'].map((role) =>
      prisma.user.create({
        data: {
          email: `${role}-${suffix}@example.invalid`,
          passwordHash: 'test-only',
        },
      }),
    ),
  );
  const company = await prisma.company.create({
    data: { name: `Test ${suffix}` },
  });
  const otherCompany = await prisma.company.create({
    data: { name: `Other ${suffix}` },
  });
  await prisma.userCompany.createMany({
    data: [owner, reviewer, member].map((user) => ({
      companyId: company.id,
      userId: user.id,
      role: 'USER',
    })),
  });
  await prisma.userCompany.create({
    data: { companyId: otherCompany.id, userId: outsider.id },
  });
  const project = await prisma.project.create({
    data: {
      name: 'Fixture',
      ownerId: owner.id,
      reviewerId: reviewer.id,
      companyId: company.id,
      workflowStatus: 'APPROVED',
    },
  });
  const otherProject = await prisma.project.create({
    data: { name: 'Other', ownerId: outsider.id, companyId: otherCompany.id },
  });
  const pack = await prisma.compliancePackVersion.create({
    data: {
      key: `test-${suffix}`,
      version: '1',
      status: 'PUBLISHED',
      questionPack: {},
      rulePack: {},
      legalRegistry: {},
    },
  });
  const assessment = await prisma.assessment.create({
    data: {
      projectId: project.id,
      packVersionId: pack.id,
      createdById: owner.id,
      status: 'CLASSIFIED',
      answers: {
        is_ai_system: true,
        used_in_eu: true,
        entity_roles: ['provider'],
      },
    },
  });
  const classification = await prisma.classificationResult.create({
    data: {
      assessmentId: assessment.id,
      category: 'minimal_risk',
      reasoningTrace: [],
      legalReferences: [],
      ambiguityFlags: [],
      resultSnapshot: {
        obligations: [{ title: 'Evidence requirement' }],
        original: true,
      },
      reviewStatus: 'REVIEWED',
    },
  });
  const definition = await prisma.obligation.create({
    data: {
      packVersionId: pack.id,
      key: 'provider-1',
      title: 'Evidence requirement',
    },
  });
  const obligation = await prisma.aiSystemObligation.create({
    data: {
      projectId: project.id,
      obligationId: definition.id,
      classificationResultId: classification.id,
      applicabilityReason: 'Original applicability',
      status: 'COMPLETE',
      approvalState: 'APPROVED',
    },
  });
  const section = await prisma.section.create({
    data: { name: 'Fixture section', content: {}, projectId: project.id },
  });
  const artifact = await prisma.sectionArtifact.create({
    data: {
      projectId: project.id,
      sectionId: section.id,
      uploadedById: owner.id,
      originalName: 'evidence.txt',
      storedName: `${suffix}.txt`,
      mimeType: 'text/plain',
      size: 8,
      checksum: 'fixture',
      citationKey: suffix,
      status: 'APPROVED',
    },
  });
  const evidence = await prisma.obligationEvidence.create({
    data: {
      aiSystemObligationId: obligation.id,
      artifactId: artifact.id,
      linkedById: owner.id,
      linkType: 'SUPPORTING',
    },
  });
  const document = await prisma.document.create({
    data: {
      projectId: project.id,
      type: 'model_card',
      url: `${suffix}.pdf`,
      approvalState: 'APPROVED',
      lifecycleStatus: 'CURRENT',
    },
  });
  await storage.write(
    'artifacts',
    artifact.storedName,
    Buffer.from('evidence'),
  );
  await storage.write(
    'documents',
    document.url,
    Buffer.from('original document'),
  );
  return {
    owner,
    reviewer,
    outsider,
    member,
    company,
    otherCompany,
    project,
    otherProject,
    pack,
    assessment,
    classification,
    obligation,
    artifact,
    evidence,
    document,
  };
}

beforeAll(async () => {
  process.env.STORAGE_ROOT = await mkdtemp(
    join(tmpdir(), 'compliance-package-test-'),
  );
  storage = new LocalFileStorageService();
  reports = new ReadinessReportService(
    prisma as never,
    projects,
    {} as never,
    {} as never,
    {} as never,
    storage,
    audit,
  );
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('PostgreSQL compliance workflows', () => {
  it('preserves populated legacy data across the migration history', async () => {
    expect(
      await prisma.project.findUnique({ where: { id: 'legacy-project' } }),
    ).toMatchObject({ name: 'Populated migration fixture' });
    expect(
      await prisma.section.findUnique({ where: { id: 'legacy-section' } }),
    ).not.toBeNull();
    expect(
      await prisma.document.findUnique({ where: { id: 'legacy-document' } }),
    ).not.toBeNull();
  });
  it('enforces tenant, member, and referenced-owner boundaries', async () => {
    const f = await fixture();
    const dto = {
      source: 'MANUAL_REVIEW' as const,
      severity: 'HIGH' as const,
      description: 'Gap',
    };
    await expect(
      assessments.createFinding(
        f.project.id,
        f.outsider.id,
        f.otherCompany.id,
        dto,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      assessments.createFinding(f.project.id, f.member.id, f.company.id, dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      assessments.createFinding(f.project.id, f.owner.id, f.company.id, {
        ...dto,
        ownerId: f.outsider.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      assessments.createAction(
        f.project.id,
        f.obligation.id,
        f.owner.id,
        f.company.id,
        { title: 'Fix', ownerId: f.outsider.id },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      await prisma.finding.count({ where: { projectId: f.project.id } }),
    ).toBe(0);
  });
  it('rolls back the primary record if its required audit fails', async () => {
    const f = await fixture();
    const brokenAudit = {
      record: jest.fn().mockRejectedValue(new Error('audit unavailable')),
    };
    const service = new AssessmentsService(
      prisma as never,
      projects,
      {} as never,
      brokenAudit as never,
    );
    await expect(
      service.createFinding(f.project.id, f.owner.id, f.company.id, {
        source: 'MANUAL_REVIEW',
        severity: 'HIGH',
        description: 'Must roll back',
      }),
    ).rejects.toThrow('audit unavailable');
    expect(
      await prisma.finding.count({ where: { projectId: f.project.id } }),
    ).toBe(0);
  });
  it('enforces remediation, supporting evidence and reviewer closure, then clears reopening timestamps', async () => {
    const f = await fixture();
    const finding = await assessments.createFinding(
      f.project.id,
      f.owner.id,
      f.company.id,
      {
        obligationId: f.obligation.id,
        source: 'MANUAL_REVIEW',
        severity: 'HIGH',
        description: 'Fix this',
      },
    );
    const update = (
      status:
        | 'ACKNOWLEDGED'
        | 'IN_REMEDIATION'
        | 'READY_FOR_REVIEW'
        | 'RESOLVED'
        | 'REOPENED',
      user = f.owner.id,
    ) =>
      assessments.updateFinding(f.project.id, finding.id, user, f.company.id, {
        status,
        resolutionSummary: 'Controls implemented',
        reviewerDecision: status === 'RESOLVED' ? 'Verified' : undefined,
      });
    await expect(update('RESOLVED', f.reviewer.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await update('ACKNOWLEDGED');
    await update('IN_REMEDIATION');
    const action = await assessments.createAction(
      f.project.id,
      f.obligation.id,
      f.owner.id,
      f.company.id,
      { title: 'Implement controls', findingId: finding.id },
    );
    await expect(update('READY_FOR_REVIEW')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      assessments.updateAction(
        f.project.id,
        action.id,
        f.owner.id,
        f.company.id,
        { closureEvidenceId: 'foreign-evidence' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await assessments.updateAction(
      f.project.id,
      action.id,
      f.owner.id,
      f.company.id,
      {
        status: 'READY_FOR_REVIEW',
        closureEvidenceId: f.evidence.id,
        closureNotes: 'Verified control evidence',
      },
    );
    await expect(
      assessments.updateAction(
        f.project.id,
        action.id,
        f.owner.id,
        f.company.id,
        { status: 'COMPLETED' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await assessments.updateAction(
      f.project.id,
      action.id,
      f.reviewer.id,
      f.company.id,
      { status: 'COMPLETED' },
    );
    await update('READY_FOR_REVIEW');
    await expect(update('RESOLVED')).rejects.toBeInstanceOf(ForbiddenException);
    expect((await update('RESOLVED', f.reviewer.id)).resolvedAt).not.toBeNull();
    expect(await update('REOPENED')).toMatchObject({
      resolvedAt: null,
      reviewerDecision: null,
    });
  });
  it('calculates complete versus incomplete packages and preserves file bytes and applicability snapshots', async () => {
    const f = await fixture();
    const first = await reports.createPackage(
      f.project.id,
      f.owner.id,
      f.company.id,
    );
    expect(first.status).toBe('COMPLETE');
    const bytes = await readFile(
      storage.resolve('packages', first.archiveFile!),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      first.archiveHash,
    );
    const archivedManifest = (
      await promisify(execFile)('unzip', [
        '-p',
        storage.resolve('packages', first.archiveFile!),
        'manifest.json',
      ])
    ).stdout;
    expect(createHash('sha256').update(archivedManifest).digest('hex')).toBe(
      first.manifestHash,
    );
    expect(
      (
        await promisify(execFile)('unzip', [
          '-p',
          storage.resolve('packages', first.archiveFile!),
          `documents/${f.document.id}.pdf`,
        ])
      ).stdout,
    ).toBe('original document');
    await storage.write(
      'documents',
      f.document.url,
      Buffer.from('changed document'),
    );
    await prisma.aiSystemObligation.update({
      where: { id: f.obligation.id },
      data: { applicabilityReason: 'Changed reason', status: 'IN_PROGRESS' },
    });
    const second = await reports.createPackage(
      f.project.id,
      f.owner.id,
      f.company.id,
    );
    expect(second.status).toBe('INCOMPLETE');
    expect(second.version).toBe(first.version + 1);
    const download = await reports.downloadPackage(
      f.project.id,
      first.id,
      f.owner.id,
      f.company.id,
    );
    const chunks: Buffer[] = [];
    for await (const chunk of download.getStream())
      chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(bytes);
    const saved = await prisma.compliancePackage.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(JSON.stringify(saved.manifest)).toContain('Original applicability');
    expect(JSON.stringify(saved.manifest)).not.toContain('Changed reason');
    expect(saved.manifestHash).toBe(first.manifestHash);
    await expect(
      reports.downloadPackage(
        f.project.id,
        first.id,
        f.outsider.id,
        f.otherCompany.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      reports.downloadPackage(
        f.otherProject.id,
        first.id,
        f.outsider.id,
        f.otherCompany.id,
      ),
    ).rejects.toThrow('Package not found');
  });
  it('assigns distinct sequential versions under concurrent creation', async () => {
    const f = await fixture();
    const packages = await Promise.all([
      reports.createPackage(f.project.id, f.owner.id, f.company.id),
      reports.createPackage(f.project.id, f.owner.id, f.company.id),
    ]);
    expect(packages.map((pkg) => pkg.version).sort()).toEqual([1, 2]);
    expect(
      await prisma.auditEvent.count({
        where: { projectId: f.project.id, entityType: 'CompliancePackage' },
      }),
    ).toBe(2);
  });
  it('rolls back package records and removes orphan archives when auditing fails', async () => {
    const f = await fixture();
    const remove = jest.spyOn(storage, 'remove');
    const service = new ReadinessReportService(
      prisma as never,
      projects,
      {} as never,
      {} as never,
      {} as never,
      storage,
      {
        record: jest.fn().mockRejectedValue(new Error('audit unavailable')),
      } as never,
    );
    await expect(
      service.createPackage(f.project.id, f.owner.id, f.company.id),
    ).rejects.toThrow('audit unavailable');
    expect(
      await prisma.compliancePackage.count({
        where: { projectId: f.project.id },
      }),
    ).toBe(0);
    expect(remove).toHaveBeenCalledWith(
      'packages',
      expect.stringMatching(/\.zip$/),
    );
    remove.mockRestore();
  });
  it('marks missing files and expired evidence incomplete, without silently regenerating files', async () => {
    const f = await fixture();
    await storage.remove('documents', f.document.url);
    await prisma.sectionArtifact.update({
      where: { id: f.artifact.id },
      data: { expiresAt: new Date(0) },
    });
    const pkg = await reports.createPackage(
      f.project.id,
      f.owner.id,
      f.company.id,
    );
    expect(pkg.status).toBe('INCOMPLETE');
    expect(JSON.stringify(pkg.manifest)).toContain('Missing file:');
    expect(JSON.stringify(pkg.manifest)).toContain(
      'lacks valid supporting evidence',
    );
  });
  it('creates idempotent system findings from the worker, never from GET', async () => {
    const f = await fixture();
    await prisma.sectionArtifact.update({
      where: { id: f.artifact.id },
      data: { expiresAt: new Date(0) },
    });
    await assessments.listFindings(f.project.id, f.member.id, f.company.id);
    expect(
      await prisma.finding.count({ where: { projectId: f.project.id } }),
    ).toBe(0);
    const worker = new EvidenceExpiryScheduler(
      prisma as never,
      new NotificationsService(prisma as never),
      audit,
    );
    await Promise.all([
      worker.scanExpiredEvidence(),
      worker.scanExpiredEvidence(),
    ]);
    expect(
      await prisma.finding.count({ where: { projectId: f.project.id } }),
    ).toBe(1);
    const event = await prisma.auditEvent.findFirstOrThrow({
      where: { projectId: f.project.id, action: 'CREATED_FROM_EVIDENCE' },
    });
    expect(event.actorId).toBeNull();
    expect(event.metadata).toMatchObject({ source: 'evidence-expiry-worker' });
  });
  it('reports legacy snapshots as unavailable without substituting current files', async () => {
    const f = await fixture();
    const legacy = await prisma.compliancePackage.create({
      data: {
        projectId: f.project.id,
        companyId: f.company.id,
        generatedById: f.owner.id,
        version: 1,
        status: 'SNAPSHOT',
        manifest: {},
        manifestHash: 'legacy',
      },
    });
    await expect(
      reports.downloadPackage(
        f.project.id,
        legacy.id,
        f.owner.id,
        f.company.id,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('creates rejected-evidence findings and suppresses future-expiry findings', async () => {
    const f = await fixture();
    const worker = new EvidenceExpiryScheduler(
      prisma as never,
      new NotificationsService(prisma as never),
      audit,
    );
    await prisma.sectionArtifact.update({
      where: { id: f.artifact.id },
      data: { expiresAt: new Date('2100-01-01') },
    });
    await worker.scanExpiredEvidence();
    expect(
      await prisma.finding.count({ where: { projectId: f.project.id } }),
    ).toBe(0);
    await prisma.sectionArtifact.update({
      where: { id: f.artifact.id },
      data: { status: 'REJECTED' },
    });
    await worker.scanExpiredEvidence();
    await worker.scanExpiredEvidence();
    expect(
      await prisma.finding.count({ where: { projectId: f.project.id } }),
    ).toBe(1);
  });
  it('does not republish published packs or mutate their regulatory definitions during classification', async () => {
    const f = await fixture();
    await expect(
      new PackLifecycleService(prisma as never).publish(f.pack.id, {
        userId: f.owner.id,
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const before = await prisma.obligation.findMany({
      where: { packVersionId: f.pack.id },
    });
    await assessments.classify(f.assessment.id, f.owner.id, f.company.id);
    expect(
      await prisma.obligation.findUnique({ where: { id: before[0].id } }),
    ).toEqual(before[0]);
    expect(
      (
        await prisma.classificationResult.findUniqueOrThrow({
          where: { id: f.classification.id },
        })
      ).resultSnapshot,
    ).toEqual({
      obligations: [{ title: 'Evidence requirement' }],
      original: true,
    });
  });
});
