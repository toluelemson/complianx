import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import { EuAiActClassificationService } from '../../regulatory-frameworks/application/classification/eu-ai-act-classification.service';
import {
  ensureRequirementCatalogueItem,
  getEuAiActRequirement,
} from '../../regulatory-frameworks/application/requirements/eu-ai-act-requirement-catalogue';

@Injectable()
export class ImportPublicResultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classification: EuAiActClassificationService,
  ) {}

  async import(
    publicResultId: string,
    userId: string,
    companyId: string,
    requestedName?: string,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { companyId, sourcePublicResultId: publicResultId },
    });
    if (existing) return { projectId: existing.id, created: false };

    const publicResult = await this.prisma.publicEuAiActResult.findUnique({
      where: { publicId: publicResultId },
      include: {
        session: { include: { answers: true } },
        packVersion: true,
      },
    });
    if (!publicResult) throw new NotFoundException('Public result not found');

    const result = publicResult.resultSnapshot as Record<string, any>;
    const answers = Object.fromEntries(
      publicResult.session.answers.map((answer) => [
        answer.questionKey,
        answer.normalizedJson,
      ]),
    );
    const importedName = answers.system_name ?? answers.ai_system_name;
    const systemName =
      requestedName?.trim() ||
      (typeof importedName === 'string' || typeof importedName === 'number'
        ? String(importedName)
        : 'Imported AI System');
    const roles = Array.isArray(result.operator_roles)
      ? result.operator_roles.filter(
          (value: unknown): value is string => typeof value === 'string',
        )
      : [];
    const riskLevel = result.prohibited
      ? 'prohibited'
      : result.high_risk
        ? 'high'
        : result.in_scope
          ? 'limited'
          : 'minimal';

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: systemName,
          industry:
            typeof answers.industry === 'string' ? answers.industry : null,
          riskLevel,
          intendedUse:
            typeof answers.use_case === 'string' ? answers.use_case : null,
          deploymentGeography: Array.isArray(answers.eu_nexus)
            ? answers.eu_nexus.join(', ')
            : null,
          operatorRoles: roles as Prisma.InputJsonValue,
          sourcePublicResultId: publicResultId,
          ownerId: userId,
          companyId,
        },
      });
      const assessment = await tx.assessment.create({
        data: {
          projectId: created.id,
          packVersionId: publicResult.packVersionId,
          createdById: userId,
          status: 'CLASSIFIED',
          answers: answers as Prisma.InputJsonValue,
        },
      });
      const classificationResult = await tx.classificationResult.create({
        data: {
          assessmentId: assessment.id,
          category: String(result.result_kind ?? 'action_required'),
          resultSnapshot: result as Prisma.InputJsonValue,
          reasoningTrace: (result.reasoning_trace ??
            []) as Prisma.InputJsonValue,
          legalReferences: (result.legal_references ??
            []) as Prisma.InputJsonValue,
          ambiguityFlags: (result.ambiguity_flags ??
            []) as Prisma.InputJsonValue,
        },
      });
      await this.materializeObligations(
        tx,
        created.id,
        publicResult.packVersionId,
        classificationResult.id,
        result,
      );
      return created;
    });

    return { projectId: project.id, created: true };
  }

  private async materializeObligations(
    tx: Prisma.TransactionClient,
    projectId: string,
    packVersionId: string,
    classificationResultId: string,
    result: Record<string, unknown>,
  ) {
    const obligations = Array.isArray(result.obligations)
      ? result.obligations.filter(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null,
        )
      : [];
    for (const item of obligations) {
      const role = typeof item.role === 'string' ? item.role : 'general';
      const metadata = getEuAiActRequirement(role);
      await ensureRequirementCatalogueItem(tx, metadata);
      const applicabilityReason = String(
        typeof item.title === 'string'
          ? item.title
          : 'Imported from the public EU AI Act checker result.',
      );
      const obligation = await tx.obligation.upsert({
        where: {
          packVersionId_key: { packVersionId, key: metadata.key },
        },
        create: {
          packVersionId,
          key: metadata.key,
          catalogueId: metadata.id,
          title: metadata.text,
          description: metadata.text,
          legalReference: metadata.article,
          aiActArticle: metadata.article,
          trustworthinessPrinciple: metadata.principle,
          architectureElements: [...metadata.architectureElements],
          verificationMethod: metadata.verificationMethod,
        },
        update: {
          catalogueId: metadata.id,
          title: metadata.text,
          description: metadata.text,
          legalReference: metadata.article,
          aiActArticle: metadata.article,
          trustworthinessPrinciple: metadata.principle,
          architectureElements: [...metadata.architectureElements],
          verificationMethod: metadata.verificationMethod,
        },
      });
      await tx.aiSystemObligation.upsert({
        where: {
          projectId_obligationId: { projectId, obligationId: obligation.id },
        },
        create: {
          projectId,
          obligationId: obligation.id,
          classificationResultId,
          applicabilityReason,
        },
        update: { classificationResultId, applicabilityReason },
      });
    }
  }
}
