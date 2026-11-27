import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvidenceLinkType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';

const linkedEvidenceInclude =
  Prisma.validator<Prisma.ObligationEvidenceInclude>()({
    artifact: {
      select: {
        id: true,
        originalName: true,
        citationKey: true,
        status: true,
        version: true,
        expiresAt: true,
      },
    },
    document: {
      select: {
        id: true,
        type: true,
        url: true,
        approvalState: true,
        lifecycleStatus: true,
        createdAt: true,
      },
    },
  });

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
            expiresAt: true,
          },
        },
        document: {
          select: {
            id: true,
            type: true,
            url: true,
            approvalState: true,
            lifecycleStatus: true,
            createdAt: true,
          },
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
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
      const linkType = input.linkType ?? EvidenceLinkType.SUPPORTING;
      const identity = {
        aiSystemObligationId: obligationId,
        artifactId: input.artifactId ?? null,
        documentId: input.documentId ?? null,
        linkType,
      };
      const existing = await tx.obligationEvidence.findFirst({
        where: identity,
        include: linkedEvidenceInclude,
      });
      if (existing) return existing;
      const link = await tx.obligationEvidence.create({
        data: {
          ...identity,
          notes: input.notes?.trim() || null,
          linkedById: userId,
        },
        include: linkedEvidenceInclude,
      });
      await this.recordChange(
        tx,
        projectId,
        companyId,
        userId,
        obligationId,
        link.id,
        linkType,
        'LINKED',
      );
      return link;
    });
  }

  private async recordChange(
    tx: Prisma.TransactionClient,
    projectId: string,
    companyId: string,
    userId: string,
    obligationId: string,
    linkId: string,
    linkType: EvidenceLinkType,
    action: 'LINKED' | 'UNLINKED',
  ) {
    const invalidated =
      linkType !== EvidenceLinkType.REFERENCE
        ? await tx.aiSystemObligation.updateMany({
            where: {
              id: obligationId,
              projectId,
              status: { not: 'NOT_APPLICABLE' },
              approvalState: 'APPROVED',
            },
            data: { status: 'UNDER_REVIEW', approvalState: 'READY_FOR_REVIEW' },
          })
        : null;
    await tx.auditEvent.create({
      data: {
        projectId,
        companyId,
        actorId: userId,
        entityType: 'ObligationEvidence',
        entityId: linkId,
        action,
        metadata: {
          obligationId,
          linkType,
          approvalInvalidated: Boolean(invalidated?.count),
        },
      },
    });
  }

  async unlink(
    projectId: string,
    obligationId: string,
    linkId: string,
    userId: string,
    companyId: string,
  ) {
    await this.authorize(projectId, obligationId, userId, companyId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
      const link = await tx.obligationEvidence.findFirst({
        where: {
          id: linkId,
          aiSystemObligationId: obligationId,
          obligation: { projectId },
        },
      });
      if (!link) throw new NotFoundException('Evidence link not found');
      await tx.obligationEvidence.delete({ where: { id: linkId } });
      await this.recordChange(
        tx,
        projectId,
        companyId,
        userId,
        obligationId,
        linkId,
        link.linkType,
        'UNLINKED',
      );
      return { success: true };
    });
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
