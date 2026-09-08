import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvidenceLinkType } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';

@Injectable()
export class ObligationEvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
  ) {
    await this.authorize(projectId, obligationId, userId, companyId);
    return this.prisma.obligationEvidence.findMany({
      where: { aiSystemObligationId: obligationId },
      include: {
        artifact: {
          select: {
            id: true,
            originalName: true,
            citationKey: true,
            status: true,
            version: true,
          },
        },
        document: {
          select: { id: true, type: true, url: true, createdAt: true },
        },
        linkedBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async link(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    input: {
      artifactId?: string;
      documentId?: string;
      linkType?: EvidenceLinkType;
      notes?: string;
    },
  ) {
    await this.authorize(projectId, obligationId, userId, companyId);
    if ((input.artifactId ? 1 : 0) + (input.documentId ? 1 : 0) !== 1) {
      throw new BadRequestException(
        'Provide exactly one artifactId or documentId',
      );
    }
    if (input.artifactId) {
      const artifact = await this.prisma.sectionArtifact.findUnique({
        where: { id: input.artifactId },
      });
      if (!artifact || artifact.projectId !== projectId)
        throw new NotFoundException('Artifact not found');
    }
    if (input.documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: input.documentId },
      });
      if (!document || document.projectId !== projectId)
        throw new NotFoundException('Document not found');
    }
    return this.prisma.obligationEvidence.create({
      data: {
        aiSystemObligationId: obligationId,
        artifactId: input.artifactId,
        documentId: input.documentId,
        linkType: input.linkType ?? EvidenceLinkType.SUPPORTING,
        notes: input.notes?.trim() || null,
        linkedById: userId,
      },
      include: {
        artifact: {
          select: {
            id: true,
            originalName: true,
            citationKey: true,
            status: true,
            version: true,
          },
        },
        document: {
          select: { id: true, type: true, url: true, createdAt: true },
        },
      },
    });
  }

  async unlink(linkId: string, userId: string, companyId: string) {
    const link = await this.prisma.obligationEvidence.findUnique({
      where: { id: linkId },
      include: { obligation: true },
    });
    if (!link) throw new NotFoundException('Evidence link not found');
    await this.projects.assertAccess(
      link.obligation.projectId,
      userId,
      companyId,
      {
        allowOwner: true,
        allowReviewer: true,
        allowApprover: true,
        allowCompanyMember: true,
      },
    );
    await this.prisma.obligationEvidence.delete({ where: { id: linkId } });
    return { success: true };
  }

  private async authorize(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
  ) {
    await this.projects.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    const obligation = await this.prisma.aiSystemObligation.findFirst({
      where: { id: obligationId, projectId },
    });
    if (!obligation) throw new NotFoundException('Obligation not found');
    return obligation;
  }
}
