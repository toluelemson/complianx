import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentStatus, ObligationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { EuAiActClassificationService } from '../../../regulatory-frameworks/application/classification/eu-ai-act-classification.service';
import { CreateComplianceActionDto } from '../../presentation/dto/create-compliance-action.dto';
import { UpdateComplianceActionDto } from '../../presentation/dto/update-compliance-action.dto';
import { UpdateObligationDto } from '../../presentation/dto/update-obligation.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly classification: EuAiActClassificationService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    companyId: string,
    packVersion?: string,
  ) {
    await this.projects.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    const pack = await this.classification.resolvePack(packVersion);
    return this.prisma.assessment.create({
      data: {
        projectId,
        packVersionId: pack.id,
        createdById: userId,
        answers: {},
      },
      include: { packVersion: { select: { version: true } } },
    });
  }

  async updateAnswers(
    assessmentId: string,
    userId: string,
    companyId: string,
    answers: Record<string, unknown>,
  ) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    return this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        status: AssessmentStatus.DRAFT,
      },
      include: { packVersion: { select: { version: true } } },
    });
  }

  async classify(assessmentId: string, userId: string, companyId: string) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    const answers =
      assessment.answers &&
      typeof assessment.answers === 'object' &&
      !Array.isArray(assessment.answers)
        ? Object.entries(assessment.answers as Record<string, unknown>).map(
            ([questionKey, normalizedJson]) => ({
              questionKey,
              normalizedJson,
            }),
          )
        : [];
    if (!answers.length) {
      throw new NotFoundException('Assessment has no answers');
    }
    const result = this.classification.evaluateAnswers(
      answers,
      assessment.packVersion,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id: assessment.id },
        data: { status: AssessmentStatus.CLASSIFIED },
      });
      const classification = await tx.classificationResult.create({
        data: {
          assessmentId: assessment.id,
          category: String(result.result_kind),
          resultSnapshot: result as Prisma.InputJsonValue,
          reasoningTrace: result.reasoning_trace as Prisma.InputJsonValue,
          legalReferences: result.legal_references as Prisma.InputJsonValue,
          ambiguityFlags: result.ambiguity_flags as Prisma.InputJsonValue,
        },
      });
      await this.materializeObligations(
        tx,
        assessment.projectId,
        assessment.packVersionId,
        classification.id,
        result,
      );
      return classification;
    });
  }

  async listObligations(projectId: string, userId: string, companyId: string) {
    await this.authorizeProject(projectId, userId, companyId);
    return this.prisma.aiSystemObligation.findMany({
      where: { projectId },
      include: {
        obligation: true,
        owner: { select: { id: true, email: true } },
        actions: {
          include: { owner: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateObligation(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    dto: UpdateObligationDto,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    const existing = await this.prisma.aiSystemObligation.findFirst({
      where: { id: obligationId, projectId },
    });
    if (!existing) throw new NotFoundException('Obligation not found');
    return this.prisma.aiSystemObligation.update({
      where: { id: obligationId },
      data: {
        status: dto.status,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      include: { obligation: true, actions: true },
    });
  }

  async createAction(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    dto: CreateComplianceActionDto,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    const obligation = await this.prisma.aiSystemObligation.findFirst({
      where: { id: obligationId, projectId },
    });
    if (!obligation) throw new NotFoundException('Obligation not found');
    return this.prisma.complianceAction.create({
      data: {
        obligationId,
        title: dto.title,
        description: dto.description,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async updateAction(
    projectId: string,
    actionId: string,
    userId: string,
    companyId: string,
    dto: UpdateComplianceActionDto,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    const action = await this.prisma.complianceAction.findUnique({
      where: { id: actionId },
      include: { obligation: true },
    });
    if (!action || action.obligation.projectId !== projectId) {
      throw new NotFoundException('Compliance action not found');
    }
    return this.prisma.complianceAction.update({
      where: { id: actionId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async get(assessmentId: string, userId: string, companyId: string) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    return assessment;
  }

  private async getAuthorized(
    assessmentId: string,
    userId: string,
    companyId: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        packVersion: true,
        classifications: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.projects.assertAccess(assessment.projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return assessment;
  }

  private async authorizeProject(
    projectId: string,
    userId: string,
    companyId: string,
  ) {
    return this.projects.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
  }

  private async materializeObligations(
    tx: Prisma.TransactionClient,
    projectId: string,
    packVersionId: string,
    classificationResultId: string,
    result: Record<string, any>,
  ) {
    const obligations = Array.isArray(result.obligations)
      ? result.obligations
      : [];
    for (const [index, item] of obligations.entries()) {
      const key = `${String(item.role ?? 'general')}-${index + 1}`;
      const obligation = await tx.obligation.upsert({
        where: { packVersionId_key: { packVersionId, key } },
        create: {
          packVersionId,
          key,
          title: String(item.title ?? key),
          legalReference: Array.isArray(result.legal_references)
            ? String(result.legal_references[index] ?? '')
            : null,
        },
        update: { title: String(item.title ?? key) },
      });
      await tx.aiSystemObligation.upsert({
        where: {
          projectId_obligationId: { projectId, obligationId: obligation.id },
        },
        create: {
          projectId,
          obligationId: obligation.id,
          classificationResultId,
          applicabilityReason:
            'Materialized from the latest EU AI Act classification.',
          status: ObligationStatus.NOT_STARTED,
        },
        update: {
          classificationResultId,
          applicabilityReason:
            'Materialized from the latest EU AI Act classification.',
        },
      });
    }
  }
}
