import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AssessmentStatus,
  ClassificationReviewStatus,
  ObligationStatus,
  FindingStatus,
  FindingSeverity,
  FindingSource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { EuAiActClassificationService } from '../../../regulatory-frameworks/application/classification/eu-ai-act-classification.service';
import { CreateComplianceActionDto } from '../../presentation/dto/create-compliance-action.dto';
import { UpdateComplianceActionDto } from '../../presentation/dto/update-compliance-action.dto';
import { UpdateObligationDto } from '../../presentation/dto/update-obligation.dto';
import { ReviewClassificationDto } from '../../presentation/dto/review-classification.dto';
import { AuditService } from '../../../audit/application/audit.service';
import { CreateFindingDto } from '../../presentation/dto/create-finding.dto';
import { UpdateFindingDto } from '../../presentation/dto/update-finding.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly classification: EuAiActClassificationService,
    private readonly audit: AuditService,
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
    const entries = Object.entries(answers).filter(([questionKey]) =>
      /^[a-zA-Z0-9_.-]{1,120}$/.test(questionKey),
    );
    if (entries.length !== Object.keys(answers).length) {
      throw new NotFoundException('Invalid assessment question key');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({
        where: { id: assessment.id },
        data: {
          answers: answers as Prisma.InputJsonValue,
          status: AssessmentStatus.DRAFT,
        },
        include: { packVersion: { select: { version: true } } },
      });
      for (const [questionKey, valueJson] of entries) {
        await tx.assessmentAnswer.upsert({
          where: {
            assessmentId_questionKey: {
              assessmentId: assessment.id,
              questionKey,
            },
          },
          create: {
            assessmentId: assessment.id,
            questionKey,
            valueJson: valueJson as Prisma.InputJsonValue,
            answeredById: userId,
          },
          update: {
            valueJson: valueJson as Prisma.InputJsonValue,
            answeredById: userId,
          },
        });
      }
      return updated;
    });
    await this.audit.record({
      companyId,
      projectId: assessment.projectId,
      actorId: userId,
      entityType: 'Assessment',
      entityId: assessment.id,
      action: 'ANSWERS_UPDATED',
      afterSnapshot: answers as Prisma.InputJsonValue,
      metadata: { questionKeys: entries.map(([key]) => key) },
    });
    return updated;
  }

  async listAnswers(assessmentId: string, userId: string, companyId: string) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    return this.prisma.assessmentAnswer.findMany({
      where: { assessmentId: assessment.id },
      select: {
        id: true,
        questionKey: true,
        valueJson: true,
        createdAt: true,
        updatedAt: true,
        answeredBy: { select: { id: true, email: true } },
      },
      orderBy: { questionKey: 'asc' },
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
    const classification = await this.prisma.$transaction(async (tx) => {
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
          frameworkKey: 'eu-ai-act',
          regulatoryContentVersion: assessment.packVersion.version,
          ruleSetVersion:
            assessment.packVersion.ruleSetVersion ??
            'classification-rules-1.0.0',
          questionnaireVersion:
            assessment.packVersion.questionnaireVersion ??
            'classification-questionnaire-1.0.0',
          evaluatedById: userId,
          inputFacts: assessment.answers as Prisma.InputJsonValue,
          rulesTriggered: result.reasoning_trace as Prisma.InputJsonValue,
          missingInformation:
            result.missing_information as Prisma.InputJsonValue,
          reviewStatus: ClassificationReviewStatus.PENDING,
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
    await this.audit.record({
      companyId,
      projectId: assessment.projectId,
      actorId: userId,
      entityType: 'ClassificationResult',
      entityId: classification.id,
      action: 'CLASSIFIED',
      afterSnapshot: classification.resultSnapshot as Prisma.InputJsonValue,
      metadata: {
        assessmentId: assessment.id,
        packVersion: assessment.packVersion.version,
        ruleSetVersion: classification.ruleSetVersion,
        questionnaireVersion: classification.questionnaireVersion,
      },
    });
    return classification;
  }

  async classifyProjectIntake(
    projectId: string,
    userId: string,
    companyId: string,
  ) {
    const project = await this.projects.getProjectForUser(
      projectId,
      userId,
      companyId,
    );
    const indicators = project.useCaseIndicators ?? [];
    const answers = {
      is_ai_system: true,
      used_in_eu: Boolean(project.deploymentGeography?.trim()),
      entity_roles: project.operatorRoles ?? [],
      intended_use: project.intendedUse,
      affected_persons: project.affectedPersons,
      prohibited_use_cases: indicators.includes('prohibited_practice')
        ? ['prohibited_practice']
        : [],
      high_risk_contexts: indicators.includes('high_risk_context')
        ? ['high_risk_context']
        : [],
      transparency_triggers: project.generatesContent
        ? ['content_generation']
        : [],
      documentation_ready: false,
      human_oversight_ready: false,
      risk_controls_ready: false,
    };
    const assessment = await this.create(projectId, userId, companyId);
    await this.updateAnswers(assessment.id, userId, companyId, answers);
    return this.classify(assessment.id, userId, companyId);
  }

  async getLatestProjectClassification(
    projectId: string,
    userId: string,
    companyId: string,
  ) {
    await this.projects.assertAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    return this.prisma.classificationResult.findFirst({
      where: { assessment: { projectId } },
      orderBy: { createdAt: 'desc' },
      include: {
        assessment: { include: { packVersion: { select: { version: true } } } },
      },
    });
  }

  async reviewClassification(
    projectId: string,
    classificationId: string,
    userId: string,
    companyId: string,
    dto: ReviewClassificationDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      select: { reviewerId: true, approverId: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.reviewerId !== userId && project.approverId !== userId) {
      throw new NotFoundException('Classification review not assigned to you');
    }
    const classification = await this.prisma.classificationResult.findFirst({
      where: { id: classificationId, assessment: { projectId } },
    });
    if (!classification)
      throw new NotFoundException('Classification not found');
    if (dto.status === 'OVERRIDDEN' && !dto.overrideCategory) {
      throw new NotFoundException('An override category is required');
    }
    const updated = await this.prisma.classificationResult.update({
      where: { id: classification.id },
      data: {
        category: dto.overrideCategory ?? classification.category,
        reviewStatus:
          dto.status === 'OVERRIDDEN'
            ? ClassificationReviewStatus.OVERRIDDEN
            : ClassificationReviewStatus.REVIEWED,
        reviewerId: userId,
        reviewedAt: new Date(),
        humanOverride:
          dto.status === 'OVERRIDDEN'
            ? ({
                category: dto.overrideCategory,
                reason: dto.reason,
              } as Prisma.InputJsonValue)
            : undefined,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'ClassificationResult',
      entityId: classification.id,
      action: 'CLASSIFICATION_REVIEWED',
      beforeSnapshot: {
        category: classification.category,
        reviewStatus: classification.reviewStatus,
      },
      afterSnapshot: {
        category: updated.category,
        reviewStatus: updated.reviewStatus,
        humanOverride: updated.humanOverride,
      },
    });
    return updated;
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

  async getObligationTraceability(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    const obligation = await this.prisma.aiSystemObligation.findFirst({
      where: { id: obligationId, projectId },
      include: {
        obligation: { include: { packVersion: true } },
        classificationResult: {
          select: {
            id: true,
            category: true,
            reviewStatus: true,
            resultSnapshot: true,
            reasoningTrace: true,
            legalReferences: true,
            regulatoryContentVersion: true,
            ruleSetVersion: true,
            questionnaireVersion: true,
            evaluatedAt: true,
            evaluatedById: true,
          },
        },
        evidence: {
          include: {
            artifact: true,
            document: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        actions: { orderBy: { createdAt: 'asc' } },
        findings: { include: { actions: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!obligation) throw new NotFoundException('Obligation not found');
    const packages = await this.prisma.compliancePackage.findMany({
      where: { projectId, companyId },
      select: { id: true, version: true, createdAt: true, manifest: true },
      orderBy: { version: 'desc' },
    });
    return {
      legalReference: obligation.obligation.legalReference,
      packVersion: {
        id: obligation.obligation.packVersion.id,
        key: obligation.obligation.packVersion.key,
        version: obligation.obligation.packVersion.version,
        legalInstrument: obligation.obligation.packVersion.legalInstrument,
        sourceUrl: obligation.obligation.packVersion.sourceUrl,
      },
      applicability: {
        status: obligation.status,
        reason: obligation.applicabilityReason,
        classification: obligation.classificationResult,
      },
      implementation: {
        priority: obligation.priority,
        ownerId: obligation.ownerId,
        dueAt: obligation.dueAt,
        approvalState: obligation.approvalState,
      },
      evidence: obligation.evidence,
      findings: obligation.findings,
      actions: obligation.actions,
      packageInclusion: packages.map((pkg) => ({
        id: pkg.id,
        version: pkg.version,
        createdAt: pkg.createdAt,
        included: JSON.stringify(pkg.manifest).includes(obligation.id),
      })),
    };
  }

  async listFindings(projectId: string, userId: string, companyId: string) {
    await this.authorizeProject(projectId, userId, companyId);
    await this.ensureEvidenceFindings(projectId, companyId, userId);
    return this.prisma.finding.findMany({
      where: { projectId },
      include: {
        obligation: { include: { obligation: true } },
        owner: { select: { id: true, email: true } },
        actions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async ensureEvidenceFindings(
    projectId: string,
    companyId: string,
    actorId: string,
  ) {
    const obligations = await this.prisma.aiSystemObligation.findMany({
      where: { projectId },
      include: {
        obligation: { select: { title: true } },
        evidence: {
          include: { artifact: { select: { status: true, expiresAt: true } } },
        },
      },
    });
    const now = new Date();
    for (const obligation of obligations) {
      for (const link of obligation.evidence) {
        const artifact = link.artifact;
        const issue =
          artifact?.status === 'REJECTED'
            ? 'Evidence was rejected during review.'
            : artifact?.expiresAt && artifact.expiresAt < now
              ? 'Evidence has expired.'
              : null;
        if (!issue) continue;
        const description = `${obligation.obligation.title}: ${issue}`;
        const existing = await this.prisma.finding.findFirst({
          where: {
            projectId,
            obligationId: obligation.id,
            source: FindingSource.EVIDENCE_REVIEW,
            description,
            status: {
              notIn: [FindingStatus.RESOLVED, FindingStatus.ACCEPTED_RISK],
            },
          },
        });
        if (existing) continue;
        const finding = await this.prisma.finding.create({
          data: {
            projectId,
            obligationId: obligation.id,
            source: FindingSource.EVIDENCE_REVIEW,
            severity: FindingSeverity.HIGH,
            description,
            evidenceBasis: {
              evidenceLinkId: link.id,
              artifactId: link.artifactId,
            },
          },
        });
        await this.audit.record({
          companyId,
          projectId,
          actorId,
          entityType: 'Finding',
          entityId: finding.id,
          action: 'CREATED_FROM_EVIDENCE',
          afterSnapshot: { description, evidenceLinkId: link.id },
        });
      }
    }
  }

  async createFinding(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateFindingDto,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    if (dto.obligationId) {
      const obligation = await this.prisma.aiSystemObligation.findFirst({
        where: { id: dto.obligationId, projectId },
      });
      if (!obligation) throw new NotFoundException('Obligation not found');
    }
    const finding = await this.prisma.finding.create({
      data: {
        projectId,
        obligationId: dto.obligationId,
        source: dto.source,
        severity: dto.severity,
        description: dto.description,
        ownerId: dto.ownerId,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'Finding',
      entityId: finding.id,
      action: 'CREATED',
      afterSnapshot: finding as unknown as Prisma.InputJsonValue,
    });
    return finding;
  }

  async updateFinding(
    projectId: string,
    findingId: string,
    userId: string,
    companyId: string,
    dto: UpdateFindingDto,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    const existing = await this.prisma.finding.findFirst({
      where: { id: findingId, projectId },
    });
    if (!existing) throw new NotFoundException('Finding not found');
    if (
      dto.status &&
      dto.status !== existing.status &&
      dto.status !== FindingStatus.REOPENED &&
      existing.status === FindingStatus.RESOLVED
    ) {
      throw new NotFoundException('Resolved findings can only be reopened');
    }
    const finding = await this.prisma.finding.update({
      where: { id: findingId },
      data: {
        status: dto.status,
        severity: dto.severity,
        description: dto.description,
        ownerId: dto.ownerId,
        resolutionSummary: dto.resolutionSummary,
        reviewerDecision: dto.reviewerDecision,
        resolvedAt:
          dto.status === FindingStatus.RESOLVED ? new Date() : undefined,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'Finding',
      entityId: findingId,
      action: 'UPDATED',
      beforeSnapshot: existing as unknown as Prisma.InputJsonValue,
      afterSnapshot: finding as unknown as Prisma.InputJsonValue,
    });
    return finding;
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
    if (dto.ownerId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { companyId: true, ownerId: true },
      });
      const ownerMembership = project?.companyId
        ? await this.prisma.userCompany.findUnique({
            where: {
              userId_companyId: {
                userId: dto.ownerId,
                companyId: project.companyId,
              },
            },
            select: { userId: true },
          })
        : project?.ownerId === dto.ownerId
          ? { userId: dto.ownerId }
          : null;
      if (!ownerMembership)
        throw new NotFoundException('Requirement owner not found');
    }
    const updated = await this.prisma.aiSystemObligation.update({
      where: { id: obligationId },
      data: {
        status: dto.status,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        priority: dto.priority,
        approvalState: dto.approvalState,
      },
      include: { obligation: true, actions: true },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'AiSystemObligation',
      entityId: obligationId,
      action: 'UPDATED',
      beforeSnapshot: {
        status: existing.status,
        priority: existing.priority,
        ownerId: existing.ownerId,
        dueAt: existing.dueAt?.toISOString() ?? null,
        approvalState: existing.approvalState,
      },
      afterSnapshot: {
        status: updated.status,
        priority: updated.priority,
        ownerId: updated.ownerId,
        dueAt: updated.dueAt?.toISOString() ?? null,
        approvalState: updated.approvalState,
      },
    });
    return updated;
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
    const action = await this.prisma.complianceAction.create({
      data: {
        obligationId,
        title: dto.title,
        description: dto.description,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        priority: dto.priority,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'ComplianceAction',
      entityId: action.id,
      action: 'CREATED',
      afterSnapshot: {
        obligationId,
        title: action.title,
        status: action.status,
        ownerId: action.ownerId,
        dueAt: action.dueAt?.toISOString() ?? null,
      },
    });
    return action;
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
    const updated = await this.prisma.complianceAction.update({
      where: { id: actionId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        priority: dto.priority,
        closureEvidenceId: dto.closureEvidenceId,
        closureNotes: dto.closureNotes,
        closedAt:
          dto.status === 'DONE' || dto.status === 'COMPLETED'
            ? new Date()
            : undefined,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'ComplianceAction',
      entityId: actionId,
      action: 'UPDATED',
      beforeSnapshot: {
        title: action.title,
        status: action.status,
        ownerId: action.ownerId,
        dueAt: action.dueAt?.toISOString() ?? null,
      },
      afterSnapshot: {
        title: updated.title,
        status: updated.status,
        ownerId: updated.ownerId,
        dueAt: updated.dueAt?.toISOString() ?? null,
      },
    });
    return updated;
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
