import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { join } from 'path';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';
import { LlmService } from '../llm/llm.service';
import { PdfService } from '../pdf/pdf.service';
import { renderDocumentHtml } from '../generator/templates';
import { mergeSections } from '../generator/utils';
import { ReadinessService } from '../generator/readiness.service';

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
  private readonly storageRoot = join(process.cwd(), 'storage', 'documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly pdfService: PdfService,
    private readonly readinessService: ReadinessService,
  ) {}

  async list(projectId: string, userId: string, companyId: string) {
    await this.projectsService.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
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
    await this.projectsService.assertAccess(
      doc.projectId,
      userId,
      companyId,
      { allowOwner: true, allowReviewer: true, allowApprover: true, allowCompanyMember: true },
    );
    const filePath = await this.regenerateDocument(doc.id, doc.projectId, doc.type);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File missing from storage');
    }
    return new StreamableFile(createReadStream(filePath), {
      disposition: `attachment; filename="${doc.type}.pdf"`,
      type: 'application/pdf',
    });
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
    const archiveStream = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    archiveStream.pipe(passThrough);

    await Promise.all(
      docs.map(async (doc) => {
        const filePath = join(this.storageRoot, doc.url);
        if (existsSync(filePath)) {
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

  private async regenerateDocument(documentId: string, projectId: string, type: string) {
    const spec = DOCUMENT_SPECS[type];
    if (!spec) {
      const existing = await this.prisma.document.findUnique({ where: { id: documentId } });
      if (!existing) {
        throw new NotFoundException('Document not found');
      }
      return join(this.storageRoot, existing.url);
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

    const merged = mergeSections(sections);
    const markdown = await this.llmService.generate(spec.mode, merged);
    const finalMarkdown =
      readiness.status === 'partial'
        ? `${this.buildReadinessNotice(readiness)}\n\n${markdown}`
        : markdown;
    const html = renderDocumentHtml(spec.label, finalMarkdown);
    const fileName = `${projectId}-${type}-${Date.now()}.pdf`;
    const filePath = join(this.storageRoot, fileName);

    await this.pdfService.htmlToPdf(html, filePath);

    const previous = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    await this.prisma.document.update({
      where: { id: documentId },
      data: { url: fileName },
    });

    if (previous?.url) {
      const previousPath = join(this.storageRoot, previous.url);
      if (previous.url !== fileName && existsSync(previousPath)) {
        await fs.unlink(previousPath).catch(() => undefined);
      }
    }

    return filePath;
  }

  private buildReadinessNotice(readiness: {
    score: number;
    summary: string;
    missingCriticalFields: string[];
    weakSections: string[];
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
        readiness.weakSections.length ? readiness.weakSections.join('; ') : 'None flagged'
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
