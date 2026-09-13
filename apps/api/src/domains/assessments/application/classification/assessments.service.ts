import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  ClassificationReviewStatus,
  ObligationStatus,
  FindingStatus,
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
    await this.authorizeMutation(projectId, userId, companyId);
    const pack = await this.classification.resolvePack(packVersion);
    return this.mutate(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          projectId,
          packVersionId: pack.id,
          createdById: userId,
          answers: {},
        },
        include: { packVersion: { select: { version: true } } },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'Assessment',
          entityId: assessment.id,
          action: 'CREATED',
          afterSnapshot: { packVersionId: pack.id },
        },
        tx,
      );
      return assessment;
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
    await this.authorizeMutation(assessment.projectId, userId, companyId);
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
      await this.audit.record(
        {
          companyId,
          projectId: assessment.projectId,
          actorId: userId,
          entityType: 'Assessment',
          entityId: assessment.id,
          action: 'ANSWERS_UPDATED',
          afterSnapshot: answers as Prisma.InputJsonValue,
          metadata: { questionKeys: entries.map(([key]) => key) },
        },
        tx,
      );
      return updated;
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
    await this.authorizeMutation(assessment.projectId, userId, companyId);
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
      await this.audit.record(
        {
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
        },
        tx,
      );
      return classification;
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
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId, true);
      const project = await tx.project.findFirst({
        where: { id: projectId, companyId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Project not found');
      const classification = await tx.classificationResult.findFirst({
        where: { id: classificationId, assessment: { projectId } },
      });
      if (!classification)
        throw new NotFoundException('Classification not found');
      if (dto.status === 'OVERRIDDEN' && !dto.overrideCategory) {
        throw new NotFoundException('An override category is required');
      }
      const updated = await tx.classificationResult.update({
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
      await this.audit.record(
        {
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
        },
        tx,
      );
      return updated;
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
            reviewerId: true,
            reviewedAt: true,
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
    const closureEvidenceIds = obligation.actions
      .map((action) => action.closureEvidenceId)
      .filter((id): id is string => Boolean(id));
    const closureEvidence = closureEvidenceIds.length
      ? await this.prisma.sectionArtifact.findMany({
          where: { id: { in: closureEvidenceIds }, projectId },
          select: {
            id: true,
            originalName: true,
            version: true,
            checksum: true,
            createdAt: true,
            uploadedById: true,
            reviewedById: true,
            reviewedAt: true,
            status: true,
          },
        })
      : [];
    const evidence = obligation.evidence.map((link) => ({
      ...link,
      artifact: link.artifact
        ? {
            ...link.artifact,
            evidenceVersion: link.artifact.version,
            evidenceHash: link.artifact.checksum,
            uploadedAt: link.artifact.createdAt,
            uploaderId: link.artifact.uploadedById,
            reviewerId: link.artifact.reviewedById,
            reviewerStatus: link.artifact.status,
          }
        : link.document,
    }));
    const missingEvidence = obligation.actions
      .filter((action) => action.status !== 'COMPLETED' && action.status !== 'DONE')
      .filter((action) => !action.closureEvidenceId)
      .map((action) => ({ id: action.id, title: action.title, status: action.status }));
    return {
      requirement: {
        id: obligation.obligation.id,
        identifier: obligation.obligation.key,
        title: obligation.obligation.title,
        description: obligation.obligation.description,
        legalReference: obligation.obligation.legalReference,
        applicability: obligation.status,
        ownerId: obligation.ownerId,
      },
      legalReference: obligation.obligation.legalReference,
      packVersion: {
        id: obligation.obligation.packVersion.id,
        key: obligation.obligation.packVersion.key,
        version: obligation.obligation.packVersion.version,
        legalInstrument: obligation.obligation.packVersion.legalInstrument,
        sourceUrl: obligation.obligation.packVersion.sourceUrl,
        regulatorySource: obligation.obligation.packVersion.legalInstrument,
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
      evidence,
      missingEvidence,
      findings: obligation.findings,
      actions: obligation.actions.map((action) => ({
        ...action,
        closureEvidence: closureEvidence.find((item) => item.id === action.closureEvidenceId) ?? null,
      })),
      review: {
        classification: obligation.classificationResult
          ? {
              status: obligation.classificationResult.reviewStatus,
              reviewerId: obligation.classificationResult.reviewerId,
              reviewedAt: obligation.classificationResult.reviewedAt,
            }
          : null,
        approvalState: obligation.approvalState,
      },
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

  async createFinding(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateFindingDto,
  ) {
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId);
      await this.validateOwner(dto.ownerId, companyId, tx);
      if (dto.obligationId) {
        const obligation = await tx.aiSystemObligation.findFirst({
          where: { id: dto.obligationId, projectId },
        });
        if (!obligation) throw new NotFoundException('Obligation not found');
      }
      const finding = await tx.finding.create({
        data: {
          projectId,
          companyId,
          obligationId: dto.obligationId,
          source: dto.source,
          severity: dto.severity,
          description: dto.description,
          ownerId: dto.ownerId,
        },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'Finding',
          entityId: finding.id,
          action: 'CREATED',
          afterSnapshot: finding as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return finding;
    });
  }

  async updateFinding(
    projectId: string,
    findingId: string,
    userId: string,
    companyId: string,
    dto: UpdateFindingDto,
  ) {
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId);
      await this.validateOwner(dto.ownerId, companyId, tx);
      const existing = await tx.finding.findFirst({
        where: { id: findingId, projectId },
      });
      if (!existing) throw new NotFoundException('Finding not found');
      const transitions: Record<FindingStatus, FindingStatus[]> = {
        OPEN: ['ACKNOWLEDGED'],
        ACKNOWLEDGED: ['IN_REMEDIATION'],
        IN_REMEDIATION: ['READY_FOR_REVIEW'],
        READY_FOR_REVIEW: ['RESOLVED', 'ACCEPTED_RISK', 'IN_REMEDIATION'],
        RESOLVED: ['REOPENED'],
        ACCEPTED_RISK: ['REOPENED'],
        REOPENED: ['ACKNOWLEDGED', 'IN_REMEDIATION'],
      };
      if (
        dto.status &&
        dto.status !== existing.status &&
        !transitions[existing.status].includes(dto.status)
      ) {
        throw new BadRequestException('Invalid finding transition');
      }
      if (
        dto.reviewerDecision !== undefined ||
        ['RESOLVED', 'ACCEPTED_RISK'].includes(dto.status ?? '')
      ) {
        await this.authorizeMutation(projectId, userId, companyId, true);
      }
      if (
        ['RESOLVED', 'ACCEPTED_RISK'].includes(existing.status) &&
        dto.status !== 'REOPENED'
      ) {
        throw new BadRequestException('Reopen the finding before editing it');
      }
      if (
        ['READY_FOR_REVIEW', 'RESOLVED', 'ACCEPTED_RISK'].includes(
          dto.status ?? '',
        )
      ) {
        if (!(dto.resolutionSummary ?? existing.resolutionSummary)?.trim()) {
          throw new BadRequestException('A resolution summary is required');
        }
        const actions = await tx.complianceAction.findMany({
          where: { findingId, obligation: { projectId } },
        });
        if (
          !actions.length ||
          actions.some(
            (action) => !['DONE', 'COMPLETED'].includes(action.status),
          )
        ) {
          throw new BadRequestException(
            'Complete all remediation actions before review',
          );
        }
        for (const action of actions)
          await this.validateClosureEvidence(
            action.closureEvidenceId,
            action.obligationId,
            projectId,
            tx,
          );
        if (
          ['RESOLVED', 'ACCEPTED_RISK'].includes(dto.status ?? '') &&
          !dto.reviewerDecision?.trim()
        ) {
          throw new BadRequestException(
            'An explicit reviewer decision is required',
          );
        }
      }
      const finding = await tx.finding.update({
        where: { id: findingId },
        data: {
          status: dto.status,
          severity: dto.severity,
          description: dto.description,
          ownerId: dto.ownerId,
          resolutionSummary: dto.resolutionSummary,
          reviewerDecision:
            dto.status === FindingStatus.REOPENED ? null : dto.reviewerDecision,
          resolvedAt:
            dto.status === FindingStatus.RESOLVED ||
            dto.status === FindingStatus.ACCEPTED_RISK
              ? new Date()
              : dto.status === FindingStatus.REOPENED
                ? null
                : undefined,
        },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'Finding',
          entityId: findingId,
          action: 'UPDATED',
          beforeSnapshot: existing as unknown as Prisma.InputJsonValue,
          afterSnapshot: finding as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return finding;
    });
  }

  async updateObligation(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    dto: UpdateObligationDto,
  ) {
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId);
      await this.validateOwner(dto.ownerId, companyId, tx);
      const existing = await tx.aiSystemObligation.findFirst({
        where: { id: obligationId, projectId },
      });
      if (!existing) throw new NotFoundException('Obligation not found');
      if (
        dto.approvalState === 'APPROVED' ||
        dto.approvalState === 'CHANGES_REQUESTED' ||
        dto.status === 'COMPLETE'
      ) {
        await this.authorizeMutation(projectId, userId, companyId, true);
      }
      const updated = await tx.aiSystemObligation.update({
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
      await this.audit.record(
        {
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
        },
        tx,
      );
      return updated;
    });
  }

  async createAction(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    dto: CreateComplianceActionDto,
  ) {
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId);
      await this.validateOwner(dto.ownerId, companyId, tx);
      const obligation = await tx.aiSystemObligation.findFirst({
        where: { id: obligationId, projectId },
      });
      if (!obligation) throw new NotFoundException('Obligation not found');
      if (dto.findingId) {
        const finding = await tx.finding.findFirst({
          where: { id: dto.findingId, projectId, obligationId },
        });
        if (!finding || ['RESOLVED', 'ACCEPTED_RISK'].includes(finding.status))
          throw new BadRequestException(
            'Finding must be open and belong to this obligation',
          );
      }
      const action = await tx.complianceAction.create({
        data: {
          obligationId,
          findingId: dto.findingId,
          title: dto.title,
          description: dto.description,
          ownerId: dto.ownerId,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          priority: dto.priority,
        },
      });
      await this.audit.record(
        {
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
        },
        tx,
      );
      return action;
    });
  }

  async updateAction(
    projectId: string,
    actionId: string,
    userId: string,
    companyId: string,
    dto: UpdateComplianceActionDto,
  ) {
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId);
      await this.validateOwner(dto.ownerId, companyId, tx);
      const action = await tx.complianceAction.findUnique({
        where: { id: actionId },
        include: { obligation: true },
      });
      if (!action || action.obligation.projectId !== projectId) {
        throw new NotFoundException('Compliance action not found');
      }
      if (action.findingId) {
        const finding = await tx.finding.findUnique({
          where: { id: action.findingId },
        });
        if (finding && ['RESOLVED', 'ACCEPTED_RISK'].includes(finding.status))
          throw new BadRequestException(
            'Reopen the finding before editing remediation',
          );
      }
      if (dto.closureEvidenceId !== undefined)
        await this.validateClosureEvidence(
          dto.closureEvidenceId,
          action.obligationId,
          projectId,
          tx,
        );
      const nextStatus = dto.status ?? action.status;
      if (nextStatus === 'READY_FOR_REVIEW') {
        if (!(dto.closureNotes ?? action.closureNotes)?.trim())
          throw new BadRequestException('Closure notes are required');
        await this.validateClosureEvidence(
          dto.closureEvidenceId ?? action.closureEvidenceId,
          action.obligationId,
          projectId,
          tx,
        );
      }
      if (['DONE', 'COMPLETED'].includes(nextStatus)) {
        await this.authorizeMutation(projectId, userId, companyId, true);
        if (
          dto.status &&
          !['READY_FOR_REVIEW', 'DONE', 'COMPLETED'].includes(action.status)
        )
          throw new BadRequestException(
            'Submit remediation for review before completion',
          );
        if (!(dto.closureNotes ?? action.closureNotes)?.trim())
          throw new BadRequestException('Closure notes are required');
        await this.validateClosureEvidence(
          dto.closureEvidenceId ?? action.closureEvidenceId,
          action.obligationId,
          projectId,
          tx,
        );
      }
      const updated = await tx.complianceAction.update({
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
              : dto.status
                ? null
                : undefined,
        },
      });
      await this.audit.record(
        {
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
        },
        tx,
      );
      return updated;
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

  private async mutate<T>(
    command: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.prisma.$transaction(command, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      )
        throw new ConflictException(
          'The compliance record changed concurrently. Reload and retry.',
        );
      throw error;
    }
  }

  private authorizeMutation(
    projectId: string,
    userId: string,
    companyId: string,
    review = false,
  ) {
    return this.projects.assertAccess(projectId, userId, companyId, {
      allowOwner: !review,
      allowReviewer: true,
      allowApprover: true,
      allowAdministrator: true,
    });
  }

  private async validateOwner(
    ownerId: string | undefined,
    companyId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (ownerId === undefined) return;
    if (
      !ownerId ||
      !(await tx.userCompany.findUnique({
        where: { userId_companyId: { userId: ownerId, companyId } },
      }))
    ) {
      throw new BadRequestException('Owner must belong to the active company');
    }
  }

  private async validateClosureEvidence(
    evidenceId: string | null | undefined,
    obligationId: string,
    projectId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (!evidenceId)
      throw new BadRequestException('Closure evidence is required');
    const link = await tx.obligationEvidence.findFirst({
      where: {
        id: evidenceId,
        aiSystemObligationId: obligationId,
        obligation: { projectId },
        linkType: { in: ['SUPPORTING', 'PRIMARY'] },
      },
      include: { artifact: true, document: true },
    });
    const now = new Date();
    const validArtifact =
      link?.artifact &&
      link.artifact.projectId === projectId &&
      link.artifact.status === 'APPROVED' &&
      (!link.artifact.expiresAt || link.artifact.expiresAt > now) &&
      (!link.artifact.validFrom || link.artifact.validFrom <= now);
    const validDocument =
      link?.document &&
      link.document.projectId === projectId &&
      link.document.approvalState === 'APPROVED' &&
      link.document.lifecycleStatus === 'CURRENT';
    if (!validArtifact && !validDocument)
      throw new BadRequestException(
        'Closure evidence must be approved, current, and support this obligation',
      );
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
        update: {},
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
