import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { createHash } from 'node:crypto';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { PdfService } from '../../../../platform/pdf/pdf.service';
import { ReadinessService } from '../readiness/readiness.service';
import { ReportCompositionService } from '../report-generation/report-composition.service';
import {
  FILE_STORAGE,
  type FileStorage,
} from '../../../../platform/files/file-storage.port';
import { AuditService } from '../../../audit/application/audit.service';

@Injectable()
export class ReadinessReportService {
  private readonly storageBucket = 'documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly readiness: ReadinessService,
    private readonly composition: ReportCompositionService,
    private readonly pdf: PdfService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    private readonly audit: AuditService,
  ) {}

  async create(projectId: string, userId: string, companyId: string) {
    await this.authorize(projectId, userId, companyId);
    const snapshot = await this.buildSnapshot(projectId);
    const markdown = this.renderMarkdown(snapshot);
    const html = this.composition.renderHtml(
      'EU AI Act Readiness Report',
      markdown,
    );
    const fileName = `${projectId}-readiness-${Date.now()}.pdf`;
    await this.storage.ensure(this.storageBucket);
    await this.pdf.htmlToPdf(
      html,
      this.storage.resolve(this.storageBucket, fileName),
    );
    const report = await this.prisma.readinessReport.create({
      data: {
        projectId,
        generatedById: userId,
        packVersionId: snapshot.packVersionId,
        score: snapshot.readiness.score,
        readinessStatus: snapshot.readiness.status,
        snapshot: snapshot as any,
        fileUrl: fileName,
      },
    });
    return {
      id: report.id,
      projectId,
      score: report.score,
      readinessStatus: report.readinessStatus,
      fileUrl: report.fileUrl,
      createdAt: report.createdAt,
      snapshot,
    };
  }

  async list(projectId: string, userId: string, companyId: string) {
    await this.authorize(projectId, userId, companyId);
    return this.prisma.readinessReport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        score: true,
        readinessStatus: true,
        fileUrl: true,
        createdAt: true,
      },
    });
  }

  async createPackage(projectId: string, userId: string, companyId: string) {
    await this.authorize(projectId, userId, companyId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      include: {
        company: { select: { id: true, name: true } },
        documents: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            packVersion: true,
            classifications: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        obligations: {
          include: {
            obligation: true,
            evidence: { include: { artifact: true, document: true } },
            actions: true,
          },
        },
        findings: { include: { actions: true } },
      },
    });
    if (!project) throw new NotFoundException('AI System not found');
    const assessment = project.assessments[0];
    const classification = assessment?.classifications[0];
    const manifest = {
      manifestVersion: 'neuraldocx-package-1.0.0',
      generatedAt: new Date().toISOString(),
      generatedById: userId,
      project: { id: project.id, name: project.name },
      organization: project.company,
      aiSystemProfile: {
        description: project.description,
        intendedUse: project.intendedUse,
        lifecycleStage: project.lifecycleStage,
        deploymentGeography: project.deploymentGeography,
        operatorRoles: project.operatorRoles,
      },
      regulatory: {
        legalInstrument: assessment?.packVersion.legalInstrument,
        packVersion: assessment?.packVersion.version,
        ruleSetVersion: assessment?.packVersion.ruleSetVersion,
        questionnaireVersion: assessment?.packVersion.questionnaireVersion,
      },
      classification: classification
        ? {
            id: classification.id,
            category: classification.category,
            reviewStatus: classification.reviewStatus,
            snapshot: classification.resultSnapshot,
          }
        : null,
      obligations: project.obligations.map((item) => ({
        id: item.id,
        key: item.obligation.key,
        title: item.obligation.title,
        legalReference: item.obligation.legalReference,
        status: item.status,
        approvalState: item.approvalState,
        applicabilityReason: item.applicabilityReason,
        evidence: item.evidence.map((link) => ({
          id: link.id,
          linkType: link.linkType,
          notes: link.notes,
          artifactId: link.artifactId,
          documentId: link.documentId,
          artifactStatus: link.artifact?.status,
        })),
        actions: item.actions,
      })),
      findings: project.findings,
      documents: project.documents.map((document) => ({
        id: document.id,
        type: document.type,
        version: document.version,
        url: document.url,
        approvalState: document.approvalState,
        lifecycleStatus: document.lifecycleStatus,
        provenanceStatus: document.provenanceStatus,
      })),
      review: {
        workflowStatus: project.workflowStatus,
        statusEvents: project.statusEvents,
      },
    };
    const manifestHash = createHash('sha256')
      .update(JSON.stringify(manifest))
      .digest('hex');
    const latest = await this.prisma.compliancePackage.aggregate({
      where: { projectId },
      _max: { version: true },
    });
    const packageRecord = await this.prisma.compliancePackage.create({
      data: {
        projectId,
        companyId,
        generatedById: userId,
        packVersionId: assessment?.packVersionId,
        version: (latest._max.version ?? 0) + 1,
        status: 'SNAPSHOT',
        manifest: manifest as unknown as Prisma.InputJsonValue,
        manifestHash,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'CompliancePackage',
      entityId: packageRecord.id,
      action: 'GENERATED',
      afterSnapshot: { version: packageRecord.version, manifestHash },
      metadata: { packVersion: assessment?.packVersion.version },
    });
    return packageRecord;
  }

  async listPackages(projectId: string, userId: string, companyId: string) {
    await this.authorize(projectId, userId, companyId);
    return this.prisma.compliancePackage.findMany({
      where: { projectId, companyId },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        projectId: true,
        version: true,
        status: true,
        manifest: true,
        manifestHash: true,
        createdAt: true,
      },
    });
  }

  async get(reportId: string, userId: string, companyId: string) {
    const report = await this.prisma.readinessReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Readiness report not found');
    await this.authorize(report.projectId, userId, companyId);
    return report;
  }

  private async buildSnapshot(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { id: true, name: true } },
        reviewer: { select: { id: true, email: true } },
        approver: { select: { id: true, email: true } },
        sections: { include: { artifacts: { select: { id: true } } } },
      },
    });
    if (!project) throw new NotFoundException('AI System not found');
    const assessment = await this.prisma.assessment.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        packVersion: { select: { id: true, version: true } },
        classifications: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const obligations = await this.prisma.aiSystemObligation.findMany({
      where: { projectId },
      include: {
        obligation: true,
        owner: { select: { id: true, email: true } },
        actions: true,
        evidence: {
          include: {
            artifact: {
              select: {
                id: true,
                originalName: true,
                citationKey: true,
                version: true,
                status: true,
              },
            },
            document: { select: { id: true, type: true, url: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const readiness = this.readiness.assess(
      project.sections as any,
      obligations.map((item) => ({
        id: item.id,
        title: item.obligation.title,
        status: item.status,
        evidenceCount: item.evidence.length,
      })),
    );
    return {
      generatedAt: new Date().toISOString(),
      packVersionId: assessment?.packVersion.id ?? null,
      packVersion: assessment?.packVersion.version ?? null,
      aiSystem: {
        id: project.id,
        name: project.name,
        description: project.description,
        intendedUse: project.intendedUse,
        deploymentGeography: project.deploymentGeography,
        operatorRoles: project.operatorRoles,
        industry: project.industry,
      },
      organization: project.company,
      classification: assessment?.classifications[0]?.resultSnapshot ?? null,
      obligations: obligations.map((item) => ({
        id: item.id,
        key: item.obligation.key,
        title: item.obligation.title,
        status: item.status,
        owner: item.owner,
        dueAt: item.dueAt,
        actions: item.actions,
        evidence: item.evidence,
      })),
      review: {
        workflowStatus: project.workflowStatus,
        reviewer: project.reviewer,
        approver: project.approver,
      },
      readiness,
    };
  }

  private renderMarkdown(snapshot: any) {
    const classification = snapshot.classification;
    const lines = [
      '# EU AI Act Readiness Report',
      '',
      `- **AI System:** ${snapshot.aiSystem.name}`,
      `- **Organization:** ${snapshot.organization?.name ?? 'Not provided'}`,
      `- **Role:** ${Array.isArray(snapshot.aiSystem.operatorRoles) ? snapshot.aiSystem.operatorRoles.join(', ') || 'Not provided' : 'Not provided'}`,
      `- **Classification:** ${classification?.result_kind ?? 'Not classified'}`,
      `- **Readiness:** ${snapshot.readiness.score}% (${snapshot.readiness.status})`,
      '',
      '## Classification explanation',
      ...(classification?.reasoning_trace ?? []).map(
        (item: any) => `- ${item.summary}`,
      ),
      '',
      '## Applicable obligations',
      ...(snapshot.obligations.length
        ? snapshot.obligations.map(
            (item: any) =>
              `- **${item.title}** — ${item.status}; evidence: ${item.evidence.length}`,
          )
        : ['- No obligations have been materialized.']),
      '',
      '## Outstanding actions',
      ...(snapshot.obligations.flatMap((item: any) =>
        item.actions
          .filter((action: any) => action.status !== 'DONE')
          .map((action: any) => `- ${action.title} (${action.status})`),
      ).length
        ? snapshot.obligations.flatMap((item: any) =>
            item.actions
              .filter((action: any) => action.status !== 'DONE')
              .map((action: any) => `- ${action.title} (${action.status})`),
          )
        : ['- None recorded.']),
      '',
      '## Review state',
      `- **Workflow:** ${snapshot.review.workflowStatus}`,
      `- **Reviewer:** ${snapshot.review.reviewer?.email ?? 'Not assigned'}`,
      `- **Approver:** ${snapshot.review.approver?.email ?? 'Not assigned'}`,
      '',
      '## Evidence references',
      ...(snapshot.obligations.flatMap((item: any) =>
        item.evidence.map(
          (evidence: any) =>
            `- ${evidence.artifact?.citationKey ?? evidence.document?.type ?? evidence.id}`,
        ),
      ).length
        ? snapshot.obligations.flatMap((item: any) =>
            item.evidence.map(
              (evidence: any) =>
                `- ${evidence.artifact?.citationKey ?? evidence.document?.type ?? evidence.id}`,
            ),
          )
        : ['- No obligation evidence linked.']),
    ];
    return lines.join('\n');
  }

  private authorize(projectId: string, userId: string, companyId: string) {
    return this.projects.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
  }
}
