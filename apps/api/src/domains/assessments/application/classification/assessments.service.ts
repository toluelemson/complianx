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
import { UpdateAssessmentScoringDto } from '../../presentation/dto/update-assessment-scoring.dto';
import {
  CreateComplianceStakeholderDto,
  CreateDocumentationItemDto,
  CreateLifecycleEventDto,
  CreateSystemAssetDto,
  CreateTechnicalMeasureDto,
  UpdateAssessmentContextDto,
  UpdateComplianceStakeholderDto,
  UpdateRequirementAssetLinksDto,
  UpdateSystemAssetDto,
  UpdateTechnicalMeasureDto,
} from '../../presentation/dto/traceability-model.dto';
import {
  ensureRequirementCatalogueItem,
  getEuAiActRequirement,
} from '../../../regulatory-frameworks/application/requirements/eu-ai-act-requirement-catalogue';
import { hasVerifiedSupportingEvidence } from '../../../ai-systems/application/projects/workflow-freshness';

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
      const existingDraft = await tx.assessment.findFirst({
        where: {
          projectId,
          packVersionId: pack.id,
          status: AssessmentStatus.DRAFT,
        },
        orderBy: { updatedAt: 'desc' },
        include: { packVersion: { select: { version: true } } },
      });
      if (existingDraft) return existingDraft;
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
      await tx.assessmentChangeLog.create({
        data: {
          assessmentId: assessment.id,
          versionNumber: assessment.versionNumber,
          action: 'CREATED',
          actorId: userId,
          snapshot: {
            packVersion: pack.version,
            weightingChoice: assessment.weightingChoice,
            targetBand: assessment.targetBand,
          },
        },
      });
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
    if (assessment.status === AssessmentStatus.FINALIZED) {
      throw new ConflictException('A finalized assessment cannot be edited');
    }
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
      await tx.assessmentChangeLog.create({
        data: {
          assessmentId: assessment.id,
          versionNumber: updated.versionNumber,
          action: 'ANSWERS_UPDATED',
          actorId: userId,
          snapshot: answers as Prisma.InputJsonValue,
        },
      });
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
    if (assessment.status === AssessmentStatus.FINALIZED) {
      throw new ConflictException(
        'A finalized assessment cannot be reclassified',
      );
    }
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
      const obligations = await tx.aiSystemObligation.findMany({
        where: { projectId: assessment.projectId },
        include: { obligation: { select: { catalogueId: true } } },
      });
      for (const obligation of obligations) {
        await tx.assessmentRequirementRow.upsert({
          where: {
            assessmentId_obligationId: {
              assessmentId: assessment.id,
              obligationId: obligation.id,
            },
          },
          create: {
            assessmentId: assessment.id,
            obligationId: obligation.id,
            requirementId: obligation.obligation.catalogueId,
            state: obligation.status,
          },
          update: { state: obligation.status },
        });
      }
      await tx.assessmentChangeLog.create({
        data: {
          assessmentId: assessment.id,
          versionNumber: assessment.versionNumber,
          action: 'CLASSIFIED',
          actorId: userId,
          snapshot: result as Prisma.InputJsonValue,
        },
      });
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

  async getWorkspace(projectId: string, userId: string, companyId: string) {
    await this.authorizeProject(projectId, userId, companyId);
    const workspace = await this.prisma.assessment.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: {
        packVersion: { select: { id: true, key: true, version: true } },
        requirementRows: {
          include: {
            obligation: {
              select: {
                id: true,
                status: true,
                obligation: {
                  select: {
                    catalogueId: true,
                    catalogue: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        changeLog: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!workspace) return null;
    return {
      ...workspace,
      requirementRows: workspace.requirementRows.map((row) => ({
        ...row,
        obligation: {
          ...row.obligation,
          obligation: canonicalRequirement(row.obligation.obligation),
        },
      })),
    };
  }

  async getTraceabilityModel(
    projectId: string,
    userId: string,
    companyId: string,
  ) {
    await this.authorizeProject(projectId, userId, companyId);
    const [
      project,
      assessment,
      assets,
      obligations,
      documentationItems,
      lifecycleEvents,
      stakeholders,
      auditEvents,
    ] = await Promise.all([
      this.prisma.project.findFirst({
        where: { id: projectId, companyId },
        select: {
          id: true,
          name: true,
          description: true,
          lifecycleStage: true,
          providerOrDeveloper: true,
          company: {
            select: {
              name: true,
              registrationNumber: true,
              country: true,
              aiActRole: true,
            },
          },
        },
      }),
      this.prisma.assessment.findFirst({
        where: { projectId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          createdBy: { select: { id: true, email: true } },
          packVersion: { select: { version: true } },
          classifications: {
            take: 1,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { id: true },
          },
          requirementRows: true,
          changeLog: { orderBy: { createdAt: 'desc' }, take: 100 },
        },
      }),
      this.prisma.systemAsset.findMany({
        where: { projectId },
        include: { documentationItems: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.aiSystemObligation.findMany({
        where: { projectId },
        include: {
          obligation: { include: { catalogue: true } },
          assetLinks: { include: { systemAsset: true } },
          technicalMeasures: { orderBy: { createdAt: 'asc' } },
          documentationItems: { orderBy: { createdAt: 'asc' } },
          evidence: {
            include: { artifact: true, document: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.documentationItem.findMany({
        where: { projectId },
        include: {
          systemAsset: { select: { id: true, name: true } },
          obligation: {
            select: {
              id: true,
              obligation: { select: { catalogueId: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.systemLifecycleEvent.findMany({
        where: { projectId },
        include: { createdBy: { select: { id: true, email: true } } },
        orderBy: [{ happenedAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.complianceStakeholder.findMany({
        where: { projectId },
        include: { createdBy: { select: { id: true, email: true } } },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.auditEvent.findMany({
        where: {
          projectId,
          companyId,
          entityType: {
            in: [
              'Assessment',
              'SystemAsset',
              'SystemLifecycleEvent',
              'ComplianceStakeholder',
              'AiSystemObligation',
              'TechnicalMeasure',
              'DocumentationItem',
            ],
          },
        },
        include: { actor: { select: { id: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
      }),
    ]);
    if (!project) throw new NotFoundException('Project not found');
    const calculatedCoverage = assessment
      ? calculateCoverageScore(assessment.requirementRows)
      : null;
    const canonicalObligations = obligations.map((item) => ({
      ...item,
      obligation: canonicalRequirement(item.obligation),
    }));
    const gaps = buildTraceabilityGaps({
      assessment,
      assets,
      obligations: canonicalObligations.filter(
        (item) =>
          !item.classificationResultId ||
          item.classificationResultId === assessment?.classifications?.[0]?.id,
      ),
      lifecycleEvents,
      stakeholders,
      documentationItems,
    });
    const history = [
      ...auditEvents.map((event) => ({
        id: event.id,
        source: 'AUDIT' as const,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        versionNumber: null,
        actor: event.actor?.email ?? 'System',
        snapshot: null,
        createdAt: event.createdAt,
      })),
      ...(assessment?.changeLog ?? []).map((event) => ({
        id: event.id,
        source: 'ASSESSMENT' as const,
        action: event.action,
        entityType: 'Assessment',
        entityId: assessment?.id ?? '',
        versionNumber: event.versionNumber,
        actor: event.actorId ?? 'System',
        snapshot: event.snapshot,
        createdAt: event.createdAt,
      })),
    ]
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, 100);
    const blockers = gaps.filter((gap) => gap.severity === 'BLOCKER');
    const assessmentFinalizedAt =
      assessment?.status === AssessmentStatus.FINALIZED
        ? assessment.updatedAt
        : null;
    const lifecycleEventsSinceFinalization = assessmentFinalizedAt
      ? lifecycleEvents.filter(
          (event) =>
            event.happenedAt.getTime() > assessmentFinalizedAt.getTime(),
        )
      : [];
    return {
      project,
      assessment: assessment
        ? {
            id: assessment.id,
            status: assessment.status,
            date: assessment.assessmentDate,
            assessorType: assessment.assessorType,
            assessorName: assessment.assessorName ?? assessment.createdBy.email,
            coverageScore: assessment.coverageScore ?? calculatedCoverage,
            versionNumber: assessment.versionNumber,
            catalogueVersion: assessment.packVersion.version,
          }
        : null,
      assets,
      obligations: canonicalObligations,
      documentationItems,
      lifecycleEvents,
      stakeholders,
      history,
      gaps,
      finalization: {
        ready: blockers.length === 0,
        blockers: blockers.map((gap) => gap.title),
      },
      reassessment: {
        required: lifecycleEventsSinceFinalization.length > 0,
        reason:
          lifecycleEventsSinceFinalization.length > 0
            ? `${lifecycleEventsSinceFinalization.length} lifecycle event(s) were recorded after this assessment was finalized.`
            : null,
      },
      scope: {
        included:
          'Article-level technical documentation, trustworthiness, measures, evidence, and assessment coverage.',
        excluded:
          'Institutional enforcement, penalties, and definitive legal conclusions remain outside this workspace and require authorized human review.',
      },
    };
  }

  async createSystemAsset(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateSystemAssetDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    const asset = await this.prisma.systemAsset.create({
      data: {
        projectId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        assetType: dto.assetType,
        lifecycleStage: dto.lifecycleStage,
        version: dto.version?.trim() || null,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'SystemAsset',
      entityId: asset.id,
      action: 'CREATED',
      afterSnapshot: asset as unknown as Prisma.InputJsonValue,
    });
    return asset;
  }

  async updateSystemAsset(
    projectId: string,
    assetId: string,
    userId: string,
    companyId: string,
    dto: UpdateSystemAssetDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    const existing = await this.prisma.systemAsset.findFirst({
      where: { id: assetId, projectId },
    });
    if (!existing) throw new NotFoundException('System asset not found');
    const asset = await this.prisma.systemAsset.update({
      where: { id: assetId },
      data: { lifecycleStage: dto.lifecycleStage },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'SystemAsset',
      entityId: asset.id,
      action: 'LIFECYCLE_STAGE_UPDATED',
      beforeSnapshot: existing as unknown as Prisma.InputJsonValue,
      afterSnapshot: asset as unknown as Prisma.InputJsonValue,
    });
    return asset;
  }

  async createLifecycleEvent(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateLifecycleEventDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    return this.mutate(async (tx) => {
      const event = await tx.systemLifecycleEvent.create({
        data: {
          projectId,
          stage: dto.stage,
          happenedAt: new Date(dto.happenedAt),
          notes: dto.notes?.trim() || null,
          createdById: userId,
        },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { lifecycleStage: dto.stage },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'SystemLifecycleEvent',
          entityId: event.id,
          action: 'LIFECYCLE_STAGE_RECORDED',
          afterSnapshot: {
            stage: event.stage,
            happenedAt: event.happenedAt.toISOString(),
            notes: event.notes,
          },
        },
        tx,
      );
      return event;
    });
  }

  async createComplianceStakeholder(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateComplianceStakeholderDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    return this.mutate(async (tx) => {
      const stakeholder = await tx.complianceStakeholder.create({
        data: {
          projectId,
          role: dto.role,
          name: dto.name.trim(),
          registrationNumber: dto.registrationNumber?.trim() || null,
          country: dto.country?.trim().toUpperCase() || null,
          contactEmail: dto.contactEmail?.trim().toLowerCase() || null,
          notes: dto.notes?.trim() || null,
          createdById: userId,
        },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'ComplianceStakeholder',
          entityId: stakeholder.id,
          action: 'CREATED',
          afterSnapshot: {
            role: stakeholder.role,
            name: stakeholder.name,
            registrationNumber: stakeholder.registrationNumber,
            country: stakeholder.country,
          },
        },
        tx,
      );
      return stakeholder;
    });
  }

  async updateComplianceStakeholder(
    projectId: string,
    stakeholderId: string,
    userId: string,
    companyId: string,
    dto: UpdateComplianceStakeholderDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    return this.mutate(async (tx) => {
      const existing = await tx.complianceStakeholder.findFirst({
        where: { id: stakeholderId, projectId },
      });
      if (!existing) throw new NotFoundException('Stakeholder not found');
      const stakeholder = await tx.complianceStakeholder.update({
        where: { id: stakeholderId },
        data: {
          role: dto.role,
          name: dto.name?.trim(),
          registrationNumber:
            dto.registrationNumber === undefined
              ? undefined
              : dto.registrationNumber.trim() || null,
          country:
            dto.country === undefined
              ? undefined
              : dto.country.trim().toUpperCase() || null,
          contactEmail:
            dto.contactEmail === undefined
              ? undefined
              : dto.contactEmail.trim().toLowerCase() || null,
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
        },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'ComplianceStakeholder',
          entityId: stakeholder.id,
          action: 'UPDATED',
          beforeSnapshot: {
            role: existing.role,
            name: existing.name,
            registrationNumber: existing.registrationNumber,
            country: existing.country,
          },
          afterSnapshot: {
            role: stakeholder.role,
            name: stakeholder.name,
            registrationNumber: stakeholder.registrationNumber,
            country: stakeholder.country,
          },
        },
        tx,
      );
      return stakeholder;
    });
  }

  async updateRequirementAssetLinks(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    dto: UpdateRequirementAssetLinksDto,
  ) {
    return this.mutate(async (tx) => {
      await this.authorizeMutation(projectId, userId, companyId);
      const obligation = await tx.aiSystemObligation.findFirst({
        where: { id: obligationId, projectId },
      });
      if (!obligation) throw new NotFoundException('Obligation not found');
      const assets = dto.assetIds.length
        ? await tx.systemAsset.findMany({
            where: { id: { in: dto.assetIds }, projectId },
            select: { id: true },
          })
        : [];
      if (assets.length !== dto.assetIds.length) {
        throw new BadRequestException(
          'Every asset must belong to this project',
        );
      }
      await tx.requirementAsset.deleteMany({
        where: { aiSystemObligationId: obligationId },
      });
      if (dto.assetIds.length) {
        await tx.requirementAsset.createMany({
          data: dto.assetIds.map((systemAssetId) => ({
            aiSystemObligationId: obligationId,
            systemAssetId,
          })),
        });
      }
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'AiSystemObligation',
          entityId: obligationId,
          action: 'ASSETS_LINKED',
          afterSnapshot: { assetIds: dto.assetIds },
        },
        tx,
      );
      return tx.requirementAsset.findMany({
        where: { aiSystemObligationId: obligationId },
        include: { systemAsset: true },
      });
    });
  }

  async createTechnicalMeasure(
    projectId: string,
    obligationId: string,
    userId: string,
    companyId: string,
    dto: CreateTechnicalMeasureDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    const obligation = await this.prisma.aiSystemObligation.findFirst({
      where: { id: obligationId, projectId },
    });
    if (!obligation) throw new NotFoundException('Obligation not found');
    const measure = await this.prisma.technicalMeasure.create({
      data: {
        aiSystemObligationId: obligationId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status,
        verificationNotes: dto.verificationNotes?.trim() || null,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'TechnicalMeasure',
      entityId: measure.id,
      action: 'CREATED',
      afterSnapshot: measure as unknown as Prisma.InputJsonValue,
    });
    return measure;
  }

  async updateTechnicalMeasure(
    projectId: string,
    measureId: string,
    userId: string,
    companyId: string,
    dto: UpdateTechnicalMeasureDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    const existing = await this.prisma.technicalMeasure.findFirst({
      where: { id: measureId, obligation: { projectId } },
    });
    if (!existing) throw new NotFoundException('Technical measure not found');
    const measure = await this.prisma.technicalMeasure.update({
      where: { id: measureId },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description.trim() || null,
        status: dto.status,
        verificationNotes:
          dto.verificationNotes === undefined
            ? undefined
            : dto.verificationNotes.trim() || null,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'TechnicalMeasure',
      entityId: measure.id,
      action: 'UPDATED',
      beforeSnapshot: existing as unknown as Prisma.InputJsonValue,
      afterSnapshot: measure as unknown as Prisma.InputJsonValue,
    });
    return measure;
  }

  async createDocumentationItem(
    projectId: string,
    userId: string,
    companyId: string,
    dto: CreateDocumentationItemDto,
  ) {
    await this.authorizeMutation(projectId, userId, companyId);
    if (!dto.systemAssetId && !dto.aiSystemObligationId) {
      throw new BadRequestException(
        'Documentation must be linked to a system asset or requirement',
      );
    }
    if (dto.systemAssetId) {
      const asset = await this.prisma.systemAsset.findFirst({
        where: { id: dto.systemAssetId, projectId },
      });
      if (!asset)
        throw new BadRequestException('Asset must belong to this project');
    }
    if (dto.aiSystemObligationId) {
      const obligation = await this.prisma.aiSystemObligation.findFirst({
        where: { id: dto.aiSystemObligationId, projectId },
      });
      if (!obligation) {
        throw new BadRequestException(
          'Requirement must belong to this project',
        );
      }
    }
    const item = await this.prisma.documentationItem.create({
      data: {
        projectId,
        documentType: dto.documentType,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        referenceUrl: dto.referenceUrl?.trim() || null,
        systemAssetId: dto.systemAssetId,
        aiSystemObligationId: dto.aiSystemObligationId,
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'DocumentationItem',
      entityId: item.id,
      action: 'CREATED',
      afterSnapshot: item as unknown as Prisma.InputJsonValue,
    });
    return item;
  }

  async updateAssessmentContext(
    projectId: string,
    assessmentId: string,
    userId: string,
    companyId: string,
    dto: UpdateAssessmentContextDto,
  ) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    if (assessment.projectId !== projectId) {
      throw new NotFoundException('Assessment not found');
    }
    if (assessment.status === AssessmentStatus.FINALIZED) {
      throw new ConflictException('A finalized assessment cannot be edited');
    }
    await this.authorizeMutation(projectId, userId, companyId);
    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessorType: dto.assessorType,
        assessorName: dto.assessorName?.trim() || null,
        assessmentDate: new Date(dto.assessmentDate),
      },
    });
    await this.audit.record({
      companyId,
      projectId,
      actorId: userId,
      entityType: 'Assessment',
      entityId: assessmentId,
      action: 'ASSESSOR_UPDATED',
      afterSnapshot: {
        assessorType: updated.assessorType,
        assessorName: updated.assessorName,
        assessmentDate: updated.assessmentDate.toISOString(),
      },
    });
    return updated;
  }

  async finalizeAssessment(
    projectId: string,
    assessmentId: string,
    userId: string,
    companyId: string,
  ) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    if (assessment.projectId !== projectId) {
      throw new NotFoundException('Assessment not found');
    }
    await this.authorizeMutation(projectId, userId, companyId, true);
    if (assessment.status === AssessmentStatus.FINALIZED) return assessment;
    const model = await this.getTraceabilityModel(projectId, userId, companyId);
    if (model.assessment?.id !== assessmentId) {
      throw new ConflictException(
        'Only the latest assessment can be finalized',
      );
    }
    if (!model.finalization.ready) {
      throw new BadRequestException({
        message: 'Assessment cannot be finalized until blockers are resolved',
        blockers: model.finalization.blockers,
      });
    }
    return this.mutate(async (tx) => {
      const updated = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: AssessmentStatus.FINALIZED,
          versionNumber: { increment: 1 },
        },
      });
      await tx.assessmentChangeLog.create({
        data: {
          assessmentId,
          versionNumber: updated.versionNumber,
          action: 'FINALIZED',
          actorId: userId,
          snapshot: {
            coverageScore: updated.coverageScore,
            assessorType: updated.assessorType,
            assessmentDate: updated.assessmentDate.toISOString(),
          },
        },
      });
      await this.audit.record(
        {
          companyId,
          projectId,
          actorId: userId,
          entityType: 'Assessment',
          entityId: assessmentId,
          action: 'FINALIZED',
          afterSnapshot: {
            status: updated.status,
            versionNumber: updated.versionNumber,
            coverageScore: updated.coverageScore,
          },
        },
        tx,
      );
      return updated;
    });
  }

  async updateScoring(
    assessmentId: string,
    userId: string,
    companyId: string,
    dto: UpdateAssessmentScoringDto,
  ) {
    const assessment = await this.getAuthorized(
      assessmentId,
      userId,
      companyId,
    );
    if (assessment.status === AssessmentStatus.FINALIZED) {
      throw new ConflictException('A finalized assessment cannot be rescored');
    }
    await this.authorizeMutation(assessment.projectId, userId, companyId);
    return this.mutate(async (tx) => {
      const rowIds = dto.rows?.map((row) => row.obligationId) ?? [];
      if (new Set(rowIds).size !== rowIds.length) {
        throw new BadRequestException(
          'Each requirement can only be scored once per save',
        );
      }
      if (rowIds.length) {
        const rows = await tx.assessmentRequirementRow.findMany({
          where: { assessmentId, obligationId: { in: rowIds } },
          select: { obligationId: true },
        });
        if (rows.length !== rowIds.length) {
          throw new NotFoundException('Assessment requirement row not found');
        }
      }
      for (const row of dto.rows ?? []) {
        await tx.assessmentRequirementRow.update({
          where: {
            assessmentId_obligationId: {
              assessmentId,
              obligationId: row.obligationId,
            },
          },
          data: {
            score: row.score,
            state: row.state,
            weight: row.weight,
            rationale: row.rationale,
            evidenceLinks: row.evidenceLinks as
              | Prisma.InputJsonValue
              | undefined,
          },
        });
      }
      const scoredRows = await tx.assessmentRequirementRow.findMany({
        where: { assessmentId },
      });
      const coverageScore = calculateCoverageScore(scoredRows);
      const updated = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          weightingChoice: dto.weightingChoice,
          targetBand: dto.targetBand,
          coverageScore,
          versionNumber: { increment: 1 },
        },
      });
      await tx.assessmentChangeLog.create({
        data: {
          assessmentId,
          versionNumber: updated.versionNumber,
          action: 'SCORING_UPDATED',
          actorId: userId,
          snapshot: {
            weightingChoice: updated.weightingChoice,
            targetBand: updated.targetBand,
            rowCount: dto.rows?.length ?? 0,
            coverageScore,
          },
        },
      });
      await this.audit.record(
        {
          companyId,
          projectId: assessment.projectId,
          actorId: userId,
          entityType: 'Assessment',
          entityId: assessmentId,
          action: 'SCORING_UPDATED',
          afterSnapshot: {
            weightingChoice: updated.weightingChoice,
            targetBand: updated.targetBand,
            versionNumber: updated.versionNumber,
            coverageScore,
          },
        },
        tx,
      );
      return updated;
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
    const obligations = await this.prisma.aiSystemObligation.findMany({
      where: { projectId },
      include: {
        obligation: { include: { catalogue: true } },
        owner: { select: { id: true, email: true } },
        actions: {
          include: { owner: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return obligations.map((obligation) => ({
      ...obligation,
      obligation: canonicalRequirement(obligation.obligation),
    }));
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
        obligation: { include: { packVersion: true, catalogue: true } },
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
            artifact: {
              include: {
                uploadedBy: { select: { id: true, email: true } },
                reviewedBy: { select: { id: true, email: true } },
              },
            },
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
    const approvalEvents = await this.prisma.auditEvent.findMany({
      where: {
        projectId,
        companyId,
        entityType: 'AiSystemObligation',
        entityId: obligationId,
        action: 'UPDATED',
      },
      include: { actor: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const approvalEvent = approvalEvents.find((event) => {
      const snapshot = event.afterSnapshot as Record<string, unknown> | null;
      return snapshot?.approvalState === 'APPROVED';
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
            reviewer: link.artifact.reviewedBy,
            uploader: link.artifact.uploadedBy,
            reviewerStatus: link.artifact.status,
          }
        : null,
    }));
    const missingEvidence = obligation.actions
      .filter(
        (action) => action.status !== 'COMPLETED' && action.status !== 'DONE',
      )
      .filter((action) => !action.closureEvidenceId)
      .map((action) => ({
        id: action.id,
        title: action.title,
        status: action.status,
      }));
    const canonical = canonicalRequirement(obligation.obligation);
    return {
      requirement: {
        id: obligation.obligation.id,
        identifier: canonical.catalogueId,
        title: canonical.title,
        description: canonical.description,
        legalReference: canonical.legalReference,
        applicability: obligation.status,
        ownerId: obligation.ownerId,
      },
      legalReference: canonical.legalReference,
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
        closureEvidence:
          closureEvidence.find(
            (item) => item.id === action.closureEvidenceId,
          ) ?? null,
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
        approval:
          obligation.approvalState === 'APPROVED' && approvalEvent
            ? {
                actor: approvalEvent.actor,
                decidedAt: approvalEvent.createdAt,
              }
            : null,
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
      if (
        (dto.approvalState === 'APPROVED' || dto.status === 'COMPLETE') &&
        (dto.status ?? existing.status) !== 'NOT_APPLICABLE'
      ) {
        const links = await tx.obligationEvidence.findMany({
          where: { aiSystemObligationId: obligationId },
          include: { artifact: true, document: true },
        });
        const now = new Date();
        if (
          !links.some((link) =>
            hasVerifiedSupportingEvidence(link, projectId, now),
          )
        ) {
          throw new BadRequestException(
            'Approve current supporting evidence before approving this requirement',
          );
        }
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'A record with the same unique identity already exists.',
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
      const catalogue = getEuAiActRequirement(role);
      await ensureRequirementCatalogueItem(tx, catalogue);
      const applicabilityReason = String(
        typeof item.title === 'string'
          ? item.title
          : 'Materialized from the latest EU AI Act classification.',
      );
      const obligation = await tx.obligation.upsert({
        where: {
          packVersionId_key: { packVersionId, key: catalogue.key },
        },
        create: {
          packVersionId,
          key: catalogue.key,
          catalogueId: catalogue.id,
          title: catalogue.text,
          description: catalogue.text,
          legalReference: catalogue.article,
          aiActArticle: catalogue.article,
          trustworthinessPrinciple: catalogue.principle,
          architectureElements: [...catalogue.architectureElements],
          verificationMethod: catalogue.verificationMethod,
        },
        update: {
          catalogueId: catalogue.id,
          title: catalogue.text,
          description: catalogue.text,
          legalReference: catalogue.article,
          aiActArticle: catalogue.article,
          trustworthinessPrinciple: catalogue.principle,
          architectureElements: [...catalogue.architectureElements],
          verificationMethod: catalogue.verificationMethod,
        },
      });
      await tx.aiSystemObligation.updateMany({
        where: {
          projectId,
          obligationId: obligation.id,
          classificationResultId: { not: null },
          approvalState: 'APPROVED',
        },
        data: { status: 'UNDER_REVIEW', approvalState: 'READY_FOR_REVIEW' },
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
          status: ObligationStatus.NOT_STARTED,
        },
        update: {
          classificationResultId,
          applicabilityReason,
        },
      });
    }
  }
}

function canonicalRequirement<
  T extends {
    catalogueId: string;
    catalogue: {
      id: string;
      text: string;
      aiActArticle: string;
      trustworthinessPrinciple: string;
      architectureElements: Prisma.JsonValue;
      verificationMethod: string;
    };
  },
>(obligation: T) {
  return {
    ...obligation,
    catalogueId: obligation.catalogue.id,
    title: obligation.catalogue.text,
    description: obligation.catalogue.text,
    legalReference: obligation.catalogue.aiActArticle,
    aiActArticle: obligation.catalogue.aiActArticle,
    trustworthinessPrinciple: obligation.catalogue.trustworthinessPrinciple,
    architectureElements: obligation.catalogue.architectureElements,
    verificationMethod: obligation.catalogue.verificationMethod,
  };
}

function calculateCoverageScore(
  rows: Array<{ score: number | null; weight: number; state: string }>,
) {
  const scored = rows.filter(
    (row) => row.score !== null && row.state !== 'NOT_APPLICABLE',
  );
  const totalWeight = scored.reduce((sum, row) => sum + row.weight, 0);
  if (!scored.length || totalWeight <= 0) return null;
  return Number(
    (
      scored.reduce((sum, row) => sum + Number(row.score) * row.weight, 0) /
      totalWeight
    ).toFixed(2),
  );
}

type TraceabilityGap = {
  id: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  category: 'ASSESSMENT' | 'ASSET' | 'STAKEHOLDER' | 'LIFECYCLE' | 'EVIDENCE';
  title: string;
  recommendation: string;
  obligationId?: string;
  assetId?: string;
};

function buildTraceabilityGaps(input: {
  assessment: null | {
    assessorType: string;
    coverageScore: number | null;
    requirementRows: Array<{
      obligationId: string;
      score: number | null;
      state: string;
      rationale: string | null;
      evidenceLinks: Prisma.JsonValue | null;
    }>;
  };
  assets: Array<{ id: string; name: string; lifecycleStage: string | null }>;
  obligations: Array<{
    id: string;
    status: string;
    obligation: { catalogueId: string; title: string };
    assetLinks: unknown[];
    technicalMeasures: Array<{ status: string }>;
    documentationItems: unknown[];
    evidence: unknown[];
  }>;
  lifecycleEvents: unknown[];
  stakeholders: Array<{ role: string }>;
  documentationItems: Array<{
    id: string;
    title: string;
    referenceUrl: string | null;
  }>;
}) {
  const gaps: TraceabilityGap[] = [];
  const add = (gap: TraceabilityGap) => gaps.push(gap);
  if (!input.assessment) {
    add({
      id: 'assessment-missing',
      severity: 'BLOCKER',
      category: 'ASSESSMENT',
      title: 'Create an assessment',
      recommendation:
        'Start an assessment and classify the system before finalization.',
    });
  } else if (input.assessment.coverageScore === null) {
    add({
      id: 'assessment-unscored',
      severity: 'BLOCKER',
      category: 'ASSESSMENT',
      title: 'Complete requirement scoring',
      recommendation:
        'Enter a score, state, weight, rationale, and evidence links for every applicable requirement.',
    });
  }
  if (!input.assets.length) {
    add({
      id: 'assets-missing',
      severity: 'BLOCKER',
      category: 'ASSET',
      title: 'Record at least one system asset',
      recommendation:
        'Add the model, dataset, software, infrastructure, interface, or human process being assessed.',
    });
  }
  for (const asset of input.assets) {
    if (!asset.lifecycleStage) {
      add({
        id: `asset-lifecycle-${asset.id}`,
        severity: 'WARNING',
        category: 'ASSET',
        title: `Set the lifecycle stage for ${asset.name}`,
        recommendation:
          'Record where this asset currently sits in its lifecycle.',
        assetId: asset.id,
      });
    }
  }
  if (!input.lifecycleEvents.length) {
    add({
      id: 'lifecycle-history-missing',
      severity: 'BLOCKER',
      category: 'LIFECYCLE',
      title: 'Record the AI system lifecycle',
      recommendation:
        'Add the current lifecycle stage and effective date so changes can be traced over time.',
    });
  }
  if (
    !input.stakeholders.some((stakeholder) =>
      ['PROVIDER', 'DEPLOYER'].includes(stakeholder.role),
    )
  ) {
    add({
      id: 'accountable-stakeholder-missing',
      severity: 'BLOCKER',
      category: 'STAKEHOLDER',
      title: 'Add a provider or deployer',
      recommendation:
        'Record the organization accountable for this AI system and its EU AI Act role.',
    });
  }
  if (
    input.assessment?.assessorType === 'NOTIFIED_BODY' &&
    !input.stakeholders.some((item) => item.role === 'NOTIFIED_BODY')
  ) {
    add({
      id: 'notified-body-missing',
      severity: 'BLOCKER',
      category: 'STAKEHOLDER',
      title: 'Identify the notified body',
      recommendation:
        'Add the notified body selected as the external assessor.',
    });
  }
  if (
    input.assessment?.assessorType === 'COMPETENT_AUTHORITY' &&
    !input.stakeholders.some((item) => item.role === 'COMPETENT_AUTHORITY')
  ) {
    add({
      id: 'competent-authority-missing',
      severity: 'BLOCKER',
      category: 'STAKEHOLDER',
      title: 'Identify the competent authority',
      recommendation:
        'Add the competent authority selected as the external assessor.',
    });
  }
  if (!input.obligations.length) {
    add({
      id: 'requirements-missing',
      severity: 'BLOCKER',
      category: 'ASSESSMENT',
      title: 'Generate applicable requirements',
      recommendation:
        'Complete classification to create the requirement catalogue rows for this system.',
    });
  }
  for (const obligation of input.obligations) {
    const row = input.assessment?.requirementRows.find(
      (candidate) => candidate.obligationId === obligation.id,
    );
    if (
      obligation.status === 'NOT_APPLICABLE' ||
      row?.state === 'NOT_APPLICABLE'
    ) {
      continue;
    }
    const label =
      obligation.obligation.catalogueId || obligation.obligation.title;
    if (!obligation.assetLinks.length) {
      add({
        id: `requirement-asset-${obligation.id}`,
        severity: 'BLOCKER',
        category: 'ASSET',
        title: `Link an asset to ${label}`,
        recommendation:
          'Select the system asset or process that implements this requirement.',
        obligationId: obligation.id,
      });
    }
    if (
      !obligation.technicalMeasures.some(
        (measure) => measure.status === 'COMPLETE',
      )
    ) {
      add({
        id: `requirement-measure-${obligation.id}`,
        severity: 'BLOCKER',
        category: 'ASSESSMENT',
        title: `Complete a technical measure for ${label}`,
        recommendation:
          'Add an implementation measure and mark it complete after verification.',
        obligationId: obligation.id,
      });
    }
    const rowEvidence = Array.isArray(row?.evidenceLinks)
      ? row.evidenceLinks.length
      : 0;
    if (
      !obligation.documentationItems.length &&
      !obligation.evidence.length &&
      !rowEvidence
    ) {
      add({
        id: `requirement-evidence-${obligation.id}`,
        severity: 'BLOCKER',
        category: 'EVIDENCE',
        title: `Provide evidence for ${label}`,
        recommendation:
          'Link an approved evidence item, documentation record, or assessment evidence URL.',
        obligationId: obligation.id,
      });
    }
    if (!row || row.score === null || !row.rationale?.trim()) {
      add({
        id: `requirement-score-${obligation.id}`,
        severity: 'BLOCKER',
        category: 'ASSESSMENT',
        title: `Complete scoring rationale for ${label}`,
        recommendation:
          'Save a score and written rationale for this applicable requirement.',
        obligationId: obligation.id,
      });
    }
  }
  for (const item of input.documentationItems) {
    if (!item.referenceUrl) {
      add({
        id: `documentation-reference-${item.id}`,
        severity: 'WARNING',
        category: 'EVIDENCE',
        title: `Add a reference for ${item.title}`,
        recommendation:
          'Add an HTTP(S) link to the controlled document or evidence record.',
      });
    }
  }
  return gaps;
}
