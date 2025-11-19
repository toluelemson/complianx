import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { LlmService } from '../llm/llm.service';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { MonetizationService } from '../monetization/monetization.service';
import { join } from 'path';
import { Document } from '@prisma/client';
import { renderDocumentHtml } from './templates';
import { mergeSections } from './utils';

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
export class GeneratorService {
  private readonly storageRoot = join(process.cwd(), 'storage', 'documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
    private readonly documentsService: DocumentsService,
    private readonly pdfService: PdfService,
    private readonly monetization: MonetizationService,
  ) {}

  async generate(
    projectId: string,
    userId: string,
    requestedTypes?: string[],
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
    const merged = mergeSections(sections);
    const appendixMarkdown = this.buildEvidenceAppendix(sections);
    const orderedTypes = Object.keys(DOCUMENT_SPECS);
    const filteredSelection = (requestedTypes ?? [])
      .map((type) => type?.toString())
      .filter((type): type is string => Boolean(type && DOCUMENT_SPECS[type]));
    const selectionSet = new Set(filteredSelection);
    const typesToGenerate =
      selectionSet.size > 0
        ? orderedTypes.filter((type) => selectionSet.has(type))
        : orderedTypes;

    const documents: Document[] = [];
    // Monetization: enforce doc generation quota based on number of documents
    await this.monetization.checkAndConsumeForProject(projectId, 'docgen', typesToGenerate.length);
    for (const type of typesToGenerate) {
      const spec = DOCUMENT_SPECS[type];
      if (!spec) {
        continue;
      }
      // Find previous document of this type to build a simple redline summary
      const previous = await this.prisma.document.findFirst({
        where: { projectId, type },
        orderBy: { createdAt: 'desc' },
      });

      const markdown = await this.llmService.generate(spec.mode, merged);
      const changesSummary = previous
        ? this.buildChangesSince(previous.createdAt, sections)
        : '';
      const assembled = [changesSummary, markdown, appendixMarkdown]
        .filter(Boolean)
        .join('\n\n');
      const finalMarkdown = assembled;
      const html = renderDocumentHtml(spec.label, finalMarkdown);
      const fileName = `${projectId}-${type}-${Date.now()}.pdf`;
      const filePath = join(this.storageRoot, fileName);
      await this.pdfService.htmlToPdf(html, filePath);
      const record = await this.documentsService.createRecord(
        projectId,
        type,
        fileName,
      );
      documents.push(record);
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
      if (s.updated) parts.push(`content updated (${s.updatedAt.toLocaleString()})`);
      if (s.newArtifacts.length)
        parts.push(`${s.newArtifacts.length} new artifact(s)`);
      lines.push(`- ${s.name}: ${parts.join(' · ')}`);
      if (s.newArtifacts.length) {
        s.newArtifacts.slice(0, 5).forEach((a) => {
          lines.push(`  - New: ${a.originalName} (${a.createdAt.toLocaleString()})`);
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
