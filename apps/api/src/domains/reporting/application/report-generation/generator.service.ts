import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { LlmService } from '../../../../platform/ai/llm.service';
import { DocumentsService } from '../../../evidence/application/documents/documents.service';
import { PdfService } from '../../../../platform/pdf/pdf.service';
import { MonetizationService } from '../../../subscriptions/application/monetization.service';
import { ReadinessService } from '../readiness/readiness.service';
import { ReportCompositionService } from './report-composition.service';
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
    label: 'EU AI Act Documentation Package',
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
export class GeneratorService {
  private readonly storageBucket = 'documents';
  private readonly logger = new Logger(GeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly documentsService: DocumentsService,
    private readonly pdfService: PdfService,
    private readonly monetization: MonetizationService,
    private readonly readinessService: ReadinessService,
    private readonly composition: ReportCompositionService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async getReadiness(projectId: string, userId: string) {
    await this.projectsService.assertOwnership(projectId, userId);
    const sections = await (this.prisma as any).section.findMany({
      where: { projectId },
      include: {
        artifacts: {
          select: { id: true },
        },
      } as any,
    });
    const obligations = await this.prisma.aiSystemObligation.findMany({
      where: { projectId },
      include: {
        obligation: { select: { title: true } },
        _count: { select: { evidence: true } },
      },
    });
    return this.readinessService.assess(
      sections,
      obligations.map((item) => ({
        id: item.id,
        title: item.obligation.title,
        status: item.status,
        evidenceCount: item._count.evidence,
      })),
    );
  }

  async generate(
    projectId: string,
    userId: string,
    requestedTypes?: string[],
    operationId?: string,
  ) {
    await this.projectsService.assertOwnership(projectId, userId);
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
            reviewedBy: { select: { id: true, email: true } },
          },
          orderBy: { version: 'asc' },
        },
      } as any,
    });
    if (!sections.length) {
      throw new BadRequestException('Please complete at least one section.');
    }
    const obligations = await this.prisma.aiSystemObligation.findMany({
      where: { projectId },
      include: {
        obligation: { select: { title: true } },
        _count: { select: { evidence: true } },
      },
    });
    const readiness = this.readinessService.assess(
      sections,
      obligations.map((item) => ({
        id: item.id,
        title: item.obligation.title,
        status: item.status,
        evidenceCount: item._count.evidence,
      })),
    );
    if (readiness.status === 'insufficient') {
      throw new BadRequestException({
        message:
          'There is not enough structured project information to generate defensible documentation yet.',
        code: 'READINESS_BLOCKED',
        readiness,
      });
    }
    const merged = this.composition.mergeSections(sections);
    const appendixMarkdown = this.buildEvidenceAppendix(sections);
    const regulatoryPack = await this.prisma.compliancePackVersion?.findFirst({
      where: { key: 'eu-ai-act', status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: { version: true },
    });
    const orderedTypes = Object.keys(DOCUMENT_SPECS);
    const filteredSelection = (requestedTypes ?? [])
      .map((type) => type?.toString())
      .filter((type): type is string => Boolean(type && DOCUMENT_SPECS[type]));
    const selectionSet = new Set(filteredSelection);
    const typesToGenerate =
      selectionSet.size > 0
        ? orderedTypes.filter((type) => selectionSet.has(type))
        : orderedTypes;

    const documents: Array<
      Awaited<ReturnType<DocumentsService['createRecord']>>
    > = [];
    for (const type of typesToGenerate) {
      const spec = DOCUMENT_SPECS[type];
      if (!spec) {
        continue;
      }
      const operationKey = operationId ? `${operationId}:${type}` : undefined;
      if (operationKey) {
        const existing = await this.prisma.document.findUnique({
          where: { operationKey },
        });
        if (existing) {
          documents.push(existing);
          continue;
        }
      }
      // Find previous document of this type to build a simple redline summary
      const previous = await this.prisma.document.findFirst({
        where: { projectId, type },
        orderBy: { createdAt: 'desc' },
      });

      const reservation = await this.monetization.reserveDocumentsForProject(
        projectId,
        1,
        operationKey,
      );
      let fileName: string | undefined;
      try {
        const markdown = await this.llmService.generate(spec.mode, merged);
        const readinessNotice =
          readiness.status === 'partial'
            ? this.buildReadinessNotice(readiness)
            : '';
        const changesSummary = previous
          ? this.buildChangesSince(previous.createdAt, sections)
          : '';
        const finalMarkdown = [
          this.buildProvenanceNotice(),
          readinessNotice,
          changesSummary,
          markdown,
          appendixMarkdown,
        ]
          .filter(Boolean)
          .join('\n\n');
        const html = this.composition.renderHtml(spec.label, finalMarkdown);
        fileName = `${projectId}-${type}-${Date.now()}.pdf`;
        const generatedFileName = fileName;
        await this.storage.ensure(this.storageBucket);
        const filePath = this.storage.resolve(this.storageBucket, fileName);
        await this.pdfService.htmlToPdf(html, filePath);
        const record = await this.prisma.$transaction(async (tx) => {
          await this.monetization.commitDocumentReservation(reservation, tx);
          await tx.document.updateMany({
            where: {
              projectId,
              type,
              lifecycleStatus: 'CURRENT',
            },
            data: { lifecycleStatus: 'SUPERSEDED' },
          });
          const latest = await tx.document.aggregate({
            where: { projectId, type },
            _max: { version: true },
          });
          return tx.document.create({
            data: {
              projectId,
              type,
              url: generatedFileName,
              operationKey,
              version: (latest._max.version ?? 0) + 1,
              frameworkKey: 'eu-ai-act',
              regulatoryContentVersion: regulatoryPack?.version,
              approvalState: 'DRAFT',
              lifecycleStatus: 'CURRENT',
              provenanceStatus: 'PARTIAL',
            },
          });
        });
        documents.push(record);
      } catch (error) {
        if (fileName) {
          try {
            await this.storage.remove(this.storageBucket, fileName);
          } catch (cleanupError) {
            this.logger.error(
              `Document file cleanup failed for ${projectId}/${type}`,
              cleanupError as Error,
            );
          }
        }
        try {
          await this.monetization.releaseDocumentReservation(reservation);
        } catch (releaseError) {
          this.logger.error(
            `Document quota release failed for ${projectId}/${type}`,
            releaseError as Error,
          );
        }
        throw error;
      }
    }
    return documents;
  }

  private buildEvidenceAppendix(
    sections: Array<{
      name: string;
      artifacts: Array<{
        citationKey: string;
        originalName: string;
        description: string | null;
        version: number;
        status: string;
        checksum: string;
        createdAt: Date;
        reviewComment: string | null;
        reviewedAt: Date | null;
        reviewedBy?: { email: string } | null;
      }>;
    }>,
  ) {
    const sectionsWithArtifacts = sections.filter(
      (section) => section.artifacts?.length,
    );
    if (!sectionsWithArtifacts.length) {
      return '';
    }
    const lines: string[] = ['## Evidence Appendix', ''];
    sectionsWithArtifacts.forEach((section) => {
      lines.push(`### ${this.formatSectionTitle(section.name)}`);
      lines.push(
        '| Citation | Artifact | Version | Status | Checksum | Notes |',
      );
      lines.push('| --- | --- | --- | --- | --- | --- |');
      section.artifacts.forEach((artifact) => {
        const notes = [
          artifact.description?.replace(/\|/g, '\\|'),
          artifact.reviewComment?.replace(/\|/g, '\\|'),
          artifact.reviewedBy?.email
            ? `Reviewed by ${artifact.reviewedBy.email}`
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ');
        lines.push(
          `| ${artifact.citationKey} | ${artifact.originalName.replace(/\|/g, '\\|')} | v${artifact.version} | ${artifact.status} | \`${artifact.checksum}\` | ${notes || ''} |`,
        );
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  private buildProvenanceNotice() {
    return [
      '## Provenance and review status',
      '',
      '- System facts and evidence are based on customer-provided workspace data.',
      '- Classification references are derived from the configured regulatory pack and deterministic rules.',
      '- Some wording may be AI-assisted and must be validated by a qualified human reviewer.',
      '- This document is not legal advice and is not an automatic finding of regulatory compliance.',
    ].join('\n');
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
        readiness.weakSections.length
          ? readiness.weakSections.join('; ')
          : 'None flagged'
      }`,
      '',
      '> This document should be treated as a draft until the missing inputs and evidence are completed.',
      '',
      '---',
      '',
    ];
    return lines.join('\n');
  }

  private formatSectionTitle(name: string) {
    return name
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private buildChangesSince(
    since: Date,
    sections: Array<{
      name: string;
      updatedAt: Date;
      artifacts: Array<{
        originalName: string;
        createdAt: Date;
      }>;
    }>,
  ) {
    const changed = sections
      .map((s) => {
        const newArtifacts = (s.artifacts || []).filter(
          (a) => a.createdAt > since,
        );
        return {
          name: this.formatSectionTitle(s.name),
          updated: s.updatedAt > since,
          updatedAt: s.updatedAt,
          newArtifacts,
        };
      })
      .filter((s) => s.updated || s.newArtifacts.length > 0);

    if (!changed.length) return '';

    const dateStr = new Date(since).toLocaleString();
    const lines: string[] = [
      `## Changes Since ${dateStr}`,
      '',
      'The following sections were updated since the last generated document:',
      '',
    ];
    changed.forEach((s) => {
      const parts: string[] = [];
      if (s.updated)
        parts.push(`content updated (${s.updatedAt.toLocaleString()})`);
      if (s.newArtifacts.length)
        parts.push(`${s.newArtifacts.length} new artifact(s)`);
      lines.push(`- ${s.name}: ${parts.join(' · ')}`);
      if (s.newArtifacts.length) {
        s.newArtifacts.slice(0, 5).forEach((a) => {
          lines.push(
            `  - New: ${a.originalName} (${a.createdAt.toLocaleString()})`,
          );
        });
        if (s.newArtifacts.length > 5) {
          lines.push(`  - …and ${s.newArtifacts.length - 5} more`);
        }
      }
    });
    lines.push('', '---', '');
    return lines.join('\n');
  }
}
