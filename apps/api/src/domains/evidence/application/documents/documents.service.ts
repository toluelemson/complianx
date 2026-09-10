import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import type {
  DocumentItem,
  GenerationReadiness,
} from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';
import { LlmService } from '../../../../platform/ai/llm.service';
import { PdfService } from '../../../../platform/pdf/pdf.service';
import { ReadinessService } from '../../../reporting/application/readiness/readiness.service';
import { ReportCompositionService } from '../../../reporting/application/report-generation/report-composition.service';
import {
  FILE_STORAGE,
  type FileStorage,
} from '../../../../platform/files/file-storage.port';

type GenerationMode = Parameters<LlmService['generate']>[0];

const DOCUMENT_SPECS: Record<
  string,
  { label: string; mode: GenerationMode; framework?: string }
> = {
  technical_doc: {
    label: 'EU AI Act Technical Documentation',
    mode: 'technical',
    framework: 'EU AI Act',
  },
  model_card: {
    label: 'Model Card',
    mode: 'model_card',
    framework: 'Model Card',
  },
  risk_assessment: {
    label: 'Risk Assessment',
    mode: 'risk',
    framework: 'Risk',
  },
  nist_rmf_profile: {
    label: 'NIST AI RMF Profile',
    mode: 'nist_rmf',
    framework: 'NIST AI RMF',
  },
};

@Injectable()
export class DocumentsService {
  private readonly storageBucket = 'documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly pdfService: PdfService,
    private readonly readinessService: ReadinessService,
    private readonly composition: ReportCompositionService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async list(
    projectId: string,
    userId: string,
    companyId: string,
  ): Promise<DocumentItem[]> {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return this.prisma.document
      .findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      })
      .then((documents) =>
        documents.map((document) => ({
          id: document.id,
          type: document.type,
          url: document.url,
          version: document.version,
          frameworkKey: document.frameworkKey,
          regulatoryContentVersion: document.regulatoryContentVersion,
          approvalState: document.approvalState,
          lifecycleStatus: document.lifecycleStatus,
          provenanceStatus: document.provenanceStatus,
          createdAt: document.createdAt.toISOString(),
        })),
      );
  }

  async createRecord(projectId: string, type: string, fileName: string) {
    return this.prisma.document.create({
      data: {
        type,
        url: fileName,
        projectId,
      },
    });
  }

  async getDocumentForDownload(id: string, userId: string, companyId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    await this.projectsService.assertAccess(doc.projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    const fileName = await this.regenerateDocument(
      doc.id,
      doc.projectId,
      doc.type,
    );
    if (!this.storage.exists(this.storageBucket, fileName)) {
      throw new NotFoundException('File missing from storage');
    }
    return new StreamableFile(
      this.storage.createReadStream(this.storageBucket, fileName),
      {
        disposition: `attachment; filename="${doc.type}.pdf"`,
        type: 'application/pdf',
      },
    );
  }

  async zipDocuments(projectId: string, userId: string, companyId: string) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
    });
    const docs = await this.prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        statusEvents: {
          include: { actor: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        obligations: {
          include: {
            obligation: {
              select: { key: true, title: true, legalReference: true },
            },
            evidence: {
              select: { artifactId: true, documentId: true, linkType: true },
            },
          },
        },
        sections: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
            comments: {
              select: {
                id: true,
                body: true,
                createdAt: true,
                resolvedAt: true,
                linkedEntityType: true,
                linkedEntityId: true,
                mentions: true,
                author: { select: { id: true, email: true } },
                resolvedBy: { select: { id: true, email: true } },
              },
            },
            artifacts: {
              select: {
                id: true,
                originalName: true,
                source: true,
                expiresAt: true,
                externalUrl: true,
                provenanceNote: true,
                version: true,
                checksum: true,
                citationKey: true,
                status: true,
              },
            },
          },
        },
        assessments: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            answers: true,
            updatedAt: true,
            classifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                category: true,
                reviewStatus: true,
                confidence: true,
                missingInformation: true,
                regulatoryContentVersion: true,
                ruleSetVersion: true,
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const archiveStream = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    archiveStream.pipe(passThrough);

    archiveStream.append(
      JSON.stringify(
        {
          schemaVersion: '1.0',
          generatedAt: new Date().toISOString(),
          project: {
            id: project.id,
            name: project.name,
            workflowStatus: project.workflowStatus,
            dueDate: project.dueDate,
          },
          documents: docs.map((doc) => ({
            id: doc.id,
            type: doc.type,
            version: doc.version,
            approvalState: doc.approvalState,
            lifecycleStatus: doc.lifecycleStatus,
            provenanceStatus: doc.provenanceStatus,
            createdAt: doc.createdAt,
          })),
          requirements: project.obligations.map((item) => ({
            id: item.id,
            key: item.obligation.key,
            title: item.obligation.title,
            legalReference: item.obligation.legalReference,
            status: item.status,
            priority: item.priority,
            approvalState: item.approvalState,
            dueAt: item.dueAt,
            evidence: item.evidence,
          })),
          assessment: project.assessments[0]
            ? {
                id: project.assessments[0].id,
                status: project.assessments[0].status,
                answers: project.assessments[0].answers,
                updatedAt: project.assessments[0].updatedAt,
                classification:
                  project.assessments[0].classifications[0] ?? null,
              }
            : null,
          evidence: project.sections.flatMap((section) =>
            section.artifacts.map((artifact) => ({
              ...artifact,
              sectionId: section.id,
              sectionName: section.name,
            })),
          ),
          sections: project.sections.map((section) => ({
            id: section.id,
            name: section.name,
            updatedAt: section.updatedAt,
            comments: section.comments,
          })),
          auditTrail: project.statusEvents,
        },
        null,
        2,
      ),
      { name: 'manifest.json' },
    );

    await Promise.all(
      docs.map(async (doc) => {
        const filePath = this.storage.resolve(this.storageBucket, doc.url);
        if (this.storage.exists(this.storageBucket, doc.url)) {
          archiveStream.file(filePath, {
            name: `${doc.type}-${doc.id}.pdf`,
          });
        }
      }),
    );

    archiveStream.finalize();
    return new StreamableFile(passThrough, {
      disposition: `attachment; filename="project-${projectId}-documents.zip"`,
      type: 'application/zip',
    });
  }

  private async regenerateDocument(
    documentId: string,
    projectId: string,
    type: string,
  ) {
    const spec = DOCUMENT_SPECS[type];
    if (!spec) {
      const existing = await this.prisma.document.findUnique({
        where: { id: documentId },
      });
      if (!existing) {
        throw new NotFoundException('Document not found');
      }
      return existing.url;
    }

    const sections = await (this.prisma as any).section.findMany({
      where: { projectId },
      include: {
        artifacts: {
          select: {
            id: true,
            originalName: true,
            description: true,
            createdAt: true,
            status: true,
            version: true,
            checksum: true,
            citationKey: true,
            reviewComment: true,
            reviewedAt: true,
          },
          orderBy: { version: 'asc' },
        },
      } as any,
    });

    const readiness = this.readinessService.assess(sections);
    if (readiness.status === 'insufficient') {
      throw new BadRequestException({
        message:
          'Document regeneration is blocked until the missing critical project information is completed.',
        code: 'READINESS_BLOCKED',
        readiness,
      });
    }

    const merged = this.composition.mergeSections(sections);
    const markdown = await this.llmService.generate(spec.mode, merged);
    const finalMarkdown =
      readiness.status === 'partial'
        ? `${this.buildReadinessNotice(readiness)}\n\n${markdown}`
        : markdown;
    const html = this.composition.renderHtml(spec.label, finalMarkdown);
    const fileName = `${projectId}-${type}-${Date.now()}.pdf`;
    const filePath = this.storage.resolve(this.storageBucket, fileName);

    await this.storage.ensure(this.storageBucket);
    await this.pdfService.htmlToPdf(html, filePath);

    const previous = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    await this.prisma.document.update({
      where: { id: documentId },
      data: { url: fileName },
    });

    if (previous?.url) {
      if (
        previous.url !== fileName &&
        this.storage.exists(this.storageBucket, previous.url)
      ) {
        await this.storage
          .remove(this.storageBucket, previous.url)
          .catch(() => undefined);
      }
    }

    return fileName;
  }

  private buildReadinessNotice(readiness: {
    score: GenerationReadiness['score'];
    summary: GenerationReadiness['summary'];
    missingCriticalFields: GenerationReadiness['missingCriticalFields'];
    weakSections: GenerationReadiness['weakSections'];
  }) {
    const lines = [
      '## Readiness Notice',
      '',
      `- **Readiness score:** ${readiness.score}%`,
      `- **Summary:** ${readiness.summary}`,
      `- **Missing critical fields:** ${
        readiness.missingCriticalFields.length
          ? readiness.missingCriticalFields.join('; ')
          : 'None flagged'
      }`,
      `- **Weak sections:** ${
        readiness.weakSections.length
          ? readiness.weakSections.join('; ')
          : 'None flagged'
      }`,
      '',
      '> This regenerated document should be treated as a draft until the missing inputs and evidence are completed.',
      '',
      '---',
      '',
    ];
    return lines.join('\n');
  }
}
