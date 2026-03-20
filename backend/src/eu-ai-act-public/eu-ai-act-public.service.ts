import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnswerType, Prisma, PublicSessionStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicSessionDto } from './dto/create-public-session.dto';
import { SavePublicAnswerDto } from './dto/save-public-answer.dto';
import { QuickAssessDto } from './dto/quick-assess.dto';

@Injectable()
export class EuAiActPublicService {
  private readonly defaultPackKey = 'eu-ai-act';
  private readonly defaultSessionDays = 7;

  constructor(private readonly prisma: PrismaService) {}

  async createSession(dto: CreatePublicSessionDto) {
    const pack = await this.resolvePackVersion(dto.packVersion);
    const sessionToken = this.generateOpaqueId(24);
    const sessionTokenHash = this.hashToken(sessionToken);
    const expiresAt = new Date(
      Date.now() + this.defaultSessionDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.publicEuAiActSession.create({
      data: {
        sessionTokenHash,
        packVersionId: pack.id,
        email: dto.email?.trim() || null,
        locale: dto.locale?.trim() || 'en',
        expiresAt,
      },
      include: {
        packVersion: true,
      },
    });

    return {
      sessionId: session.id,
      sessionToken,
      expiresAt: session.expiresAt,
      packVersion: session.packVersion.version,
      questionPack: session.packVersion.questionPack,
      steps: this.extractSteps(session.packVersion.questionPack),
    };
  }

  async quickAssess(dto: QuickAssessDto) {
    const pack = await this.resolvePackVersion();
    const answersMap =
      dto.answers && typeof dto.answers === 'object' ? dto.answers : {};
    const answerEntries = Object.entries(answersMap).map(([questionKey, value]) => ({
      questionKey,
      normalizedJson: value,
    }));

    if (!answerEntries.length) {
      throw new BadRequestException('At least one answer is required');
    }

    const resultPayload = this.evaluateAnswers(answerEntries);
    const publicId = `public_${this.generateOpaqueId(10)}`;
    const sessionToken = this.generateOpaqueId(24);
    const sessionTokenHash = this.hashToken(sessionToken);
    const now = new Date();
    const expiresAt = new Date(
      Date.now() + this.defaultSessionDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.publicEuAiActSession.create({
        data: {
          sessionTokenHash,
          packVersionId: pack.id,
          locale: dto.locale?.trim() || 'en',
          status: PublicSessionStatus.COMPLETED,
          completedAt: now,
          expiresAt,
        },
      });

      if (answerEntries.length) {
        await tx.publicEuAiActAnswer.createMany({
          data: answerEntries.map((entry) => ({
            sessionId: session.id,
            questionKey: entry.questionKey,
            answerType: this.inferAnswerType(entry.normalizedJson),
            valueJson: this.toPrismaJson(entry.normalizedJson),
            normalizedJson: this.toPrismaJson(entry.normalizedJson),
          })),
        });
      }

      return tx.publicEuAiActResult.create({
        data: {
          publicId,
          sessionId: session.id,
          packVersionId: pack.id,
          ruleVersion: pack.version,
          legalVersion: pack.version,
          resultSnapshot: resultPayload as unknown as Prisma.InputJsonValue,
          reasoningTrace:
            resultPayload.reasoning_trace as unknown as Prisma.InputJsonValue,
          obligations:
            resultPayload.obligations as unknown as Prisma.InputJsonValue,
          evidenceChecklist:
            resultPayload.missing_evidence as unknown as Prisma.InputJsonValue,
          nextDocuments:
            resultPayload.next_required_documents as unknown as Prisma.InputJsonValue,
          ambiguityFlags:
            resultPayload.ambiguity_flags as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return {
      resultId: result.publicId,
      status: PublicSessionStatus.COMPLETED,
      summary: this.buildSummary(resultPayload),
      redirectUrl: `/eu-ai-act-checker/results/${result.publicId}`,
    };
  }

  async getSession(sessionId: string, sessionToken: string) {
    const session = await this.requireSession(sessionId, sessionToken);
    return {
      id: session.id,
      status: session.status,
      packVersion: session.packVersion.version,
      questionPack: session.packVersion.questionPack,
      answers: Object.fromEntries(
        session.answers.map((answer) => [answer.questionKey, answer.valueJson]),
      ),
      currentStep: this.getCurrentStep(session.packVersion.questionPack, session.answers),
      expiresAt: session.expiresAt,
    };
  }

  async saveAnswer(
    sessionId: string,
    sessionToken: string,
    questionKey: string,
    dto: SavePublicAnswerDto,
  ) {
    const session = await this.requireSession(sessionId, sessionToken);
    const answerType = this.inferAnswerType(dto.value);
    const normalized = this.toPrismaJson(dto.value);

    const answer = await this.prisma.publicEuAiActAnswer.upsert({
      where: {
        sessionId_questionKey: {
          sessionId: session.id,
          questionKey,
        },
      },
      create: {
        sessionId: session.id,
        questionKey,
        answerType,
        valueJson: normalized,
        normalizedJson: normalized,
      },
      update: {
        answerType,
        valueJson: normalized,
        normalizedJson: normalized,
      },
    });

    await this.prisma.publicEuAiActSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return {
      saved: true,
      questionKey,
      normalized: answer.normalizedJson,
      updatedAt: answer.updatedAt,
    };
  }

  async finalizeSession(
    sessionId: string,
    sessionToken: string,
    confirmCompleteness: boolean,
  ) {
    if (!confirmCompleteness) {
      throw new BadRequestException('confirmCompleteness must be true');
    }

    const session = await this.requireSession(sessionId, sessionToken);
    if (session.result) {
      return {
        resultId: session.result.publicId,
        status: session.status,
        summary: this.buildSummary(session.result.resultSnapshot as Record<string, unknown>),
        redirectUrl: `/eu-ai-act-checker/results/${session.result.publicId}`,
      };
    }

    if (!session.answers.length) {
      throw new BadRequestException('At least one answer is required');
    }

    const resultPayload = this.evaluateAnswers(session.answers);
    const publicId = `public_${this.generateOpaqueId(10)}`;

    const result = await this.prisma.publicEuAiActResult.create({
      data: {
        publicId,
        sessionId: session.id,
        packVersionId: session.packVersionId,
        ruleVersion: session.packVersion.version,
        legalVersion: session.packVersion.version,
        resultSnapshot: resultPayload as unknown as Prisma.InputJsonValue,
        reasoningTrace:
          resultPayload.reasoning_trace as unknown as Prisma.InputJsonValue,
        obligations: resultPayload.obligations as unknown as Prisma.InputJsonValue,
        evidenceChecklist:
          resultPayload.missing_evidence as unknown as Prisma.InputJsonValue,
        nextDocuments:
          resultPayload.next_required_documents as unknown as Prisma.InputJsonValue,
        ambiguityFlags:
          resultPayload.ambiguity_flags as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.publicEuAiActSession.update({
      where: { id: session.id },
      data: {
        status: PublicSessionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return {
      resultId: result.publicId,
      status: PublicSessionStatus.COMPLETED,
      summary: this.buildSummary(resultPayload),
      redirectUrl: `/eu-ai-act-checker/results/${result.publicId}`,
    };
  }

  async getResult(publicId: string) {
    const result = await this.prisma.publicEuAiActResult.findUnique({
      where: { publicId },
      include: { packVersion: true },
    });
    if (!result) {
      throw new NotFoundException('Public result not found');
    }

    const resultSnapshot = result.resultSnapshot as Record<string, unknown>;
    const legalReferenceIds = Array.isArray(resultSnapshot.legal_references)
      ? (resultSnapshot.legal_references as string[])
      : [];
    const legalRegistry =
      result.packVersion.legalRegistry &&
      typeof result.packVersion.legalRegistry === 'object' &&
      'references' in (result.packVersion.legalRegistry as Record<string, unknown>) &&
      Array.isArray((result.packVersion.legalRegistry as any).references)
        ? ((result.packVersion.legalRegistry as any).references as Array<Record<string, unknown>>)
        : [];
    const legalReferences = legalRegistry.filter((reference) =>
      legalReferenceIds.includes(String(reference.id ?? '')),
    );

    return {
      resultId: result.publicId,
      packVersion: result.packVersion.version,
      result: resultSnapshot,
      legalReferences,
      shareEnabled: result.shareEnabled,
      notLegalAdvice: true,
    };
  }

  private async resolvePackVersion(requestedVersion?: string) {
    const where = requestedVersion
      ? {
          key: this.defaultPackKey,
          version: requestedVersion,
        }
      : {
          key: this.defaultPackKey,
          status: 'PUBLISHED' as const,
        };

    const pack = await this.prisma.compliancePackVersion.findFirst({
      where,
      orderBy: requestedVersion ? undefined : { publishedAt: 'desc' },
    });

    if (!pack) {
      throw new NotFoundException(
        requestedVersion
          ? `Compliance pack version ${requestedVersion} not found`
          : 'No published EU AI Act compliance pack is available',
      );
    }

    return pack;
  }

  private async requireSession(sessionId: string, sessionToken: string) {
    const session = await this.prisma.publicEuAiActSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: true,
        result: true,
        packVersion: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Public session not found');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Public session has expired');
    }
    if (session.sessionTokenHash !== this.hashToken(sessionToken)) {
      throw new UnauthorizedException('Invalid public session token');
    }
    return session;
  }

  private inferAnswerType(value: unknown): AnswerType {
    if (Array.isArray(value)) return AnswerType.MULTI;
    if (typeof value === 'boolean') return AnswerType.BOOLEAN;
    if (typeof value === 'number') return AnswerType.NUMBER;
    if (typeof value === 'string') return AnswerType.TEXT;
    return AnswerType.SINGLE;
  }

  private toPrismaJson(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined) {
      return Prisma.JsonNull;
    }
    if (value === null) {
      return Prisma.JsonNull;
    }
    return value as Prisma.InputJsonValue;
  }

  private extractSteps(questionPack: unknown) {
    if (
      !questionPack ||
      typeof questionPack !== 'object' ||
      !('steps' in questionPack) ||
      !Array.isArray((questionPack as any).steps)
    ) {
      return [];
    }

    return (questionPack as any).steps.map((step: any) => ({
      key: step.key,
      title: step.title,
    }));
  }

  private getCurrentStep(questionPack: unknown, answers: Array<{ questionKey: string }>) {
    if (
      !questionPack ||
      typeof questionPack !== 'object' ||
      !('steps' in questionPack) ||
      !Array.isArray((questionPack as any).steps)
    ) {
      return null;
    }

    const answered = new Set(answers.map((answer) => answer.questionKey));
    for (const step of (questionPack as any).steps) {
      const questions = Array.isArray(step.questions) ? step.questions : [];
      const hasUnanswered = questions.some((question: any) => !answered.has(question.key));
      if (hasUnanswered) {
        return step.key ?? null;
      }
    }

    return (questionPack as any).steps.at(-1)?.key ?? null;
  }

  private evaluateAnswers(
    answers: Array<{ questionKey: string; normalizedJson: unknown }>,
  ) {
    const map = Object.fromEntries(
      answers.map((answer) => [answer.questionKey, answer.normalizedJson]),
    ) as Record<string, any>;

    const role =
      typeof map.company_role === 'string' && map.company_role.length > 0
        ? map.company_role
        : null;
    const roles = role ? [role] : Array.isArray(map.entity_roles) ? map.entity_roles : [];
    const prohibitedUseCases = Array.isArray(map.prohibited_use_cases)
      ? map.prohibited_use_cases
      : [];
    const highRiskContexts = Array.isArray(map.high_risk_contexts)
      ? map.high_risk_contexts
      : Array.isArray(map.annex_iii_categories)
      ? map.annex_iii_categories
      : [];
    const transparencyTriggers = Array.isArray(map.transparency_triggers)
      ? map.transparency_triggers
      : [];
    const otherFrameworks = Array.isArray(map.other_frameworks)
      ? map.other_frameworks
      : [];

    const aiSystem = map.is_ai_system === true;
    const usedInEu =
      map.used_in_eu === true ||
      (Array.isArray(map.eu_nexus) && map.eu_nexus.length > 0);
    const inScope = aiSystem && usedInEu;
    const excluded = false;
    const prohibited = prohibitedUseCases.length > 0;
    const gpai = false;
    const gpaiSystemicRisk = false;
    const highRisk = !prohibited && !excluded && highRiskContexts.length > 0;
    const consideredProvider = false;
    const operatorRoles = roles;
    const humanOversightReady = map.human_oversight_ready !== false;
    const riskControlsReady = map.risk_controls_ready !== false;
    const documentationReady = map.documentation_ready !== false;
    const conformityProcessReady =
      highRisk ? map.conformity_process_ready === true : true;
    const outOfScope = !inScope;
    const resultKind = !aiSystem
      ? 'not_applicable'
      : !usedInEu
      ? 'out_of_scope'
      : prohibited
      ? 'prohibited'
      : highRisk || !humanOversightReady || !riskControlsReady || !documentationReady || !conformityProcessReady
      ? 'action_required'
      : 'likely_compliant';

    const obligations: Array<Record<string, unknown>> = [];
    if (!outOfScope && operatorRoles.includes('provider')) {
      obligations.push({
        role: 'provider',
        title: highRisk
          ? 'Provider obligations for a high-risk AI use case should be completed and evidenced.'
          : 'Provider governance and documentation should be maintained.',
      });
    }
    if (!outOfScope && operatorRoles.includes('deployer')) {
      obligations.push({
        role: 'deployer',
        title: 'Deployer oversight, human review, and use-context controls should be in place.',
      });
    }
    if (!outOfScope && operatorRoles.includes('importer')) {
      obligations.push({
        role: 'importer',
        title: 'Importer checks and market-placement controls should be documented',
      });
    }
    if (!outOfScope && transparencyTriggers.length > 0) {
      obligations.push({
        role: 'transparency',
        title: 'Users should receive the relevant AI transparency notice.',
      });
    }

    const nextDocuments = outOfScope
      ? []
      : [
          'ai_system_classification_memo',
          ...(highRisk ? ['high_risk_ai_compliance_plan', 'technical_documentation_starter_pack'] : []),
          ...(transparencyTriggers.length > 0 ? ['transparency_disclosure_text'] : []),
          ...(otherFrameworks.includes('nist_ai_rmf') ? ['nist_ai_rmf_gap_summary'] : []),
          ...(otherFrameworks.includes('iso_42001') ? ['iso_42001_readiness_note'] : []),
          ...(otherFrameworks.includes('gdpr') ? ['data_protection_control_checklist'] : []),
          ...(otherFrameworks.includes('internal_policy') ? ['internal_governance_alignment_note'] : []),
          'audit_trail_summary',
        ];

    const missingEvidence: string[] = [];
    if (!outOfScope && !humanOversightReady) {
      missingEvidence.push('Documented human oversight for key decisions');
    }
    if (!outOfScope && !riskControlsReady) {
      missingEvidence.push('Documented risk controls and ongoing monitoring');
    }
    if (!outOfScope && !documentationReady) {
      missingEvidence.push('Core compliance documentation and evidence pack');
    }
    if (!outOfScope && highRisk && !conformityProcessReady) {
      missingEvidence.push('High-risk conformity and registration readiness');
    }
    if (!outOfScope && prohibited) {
      missingEvidence.push('Prohibited-use escalation record and remediation plan');
    }

    const legalReferences = [
      ...(inScope ? ['art-2-scope', 'art-3-ai-system'] : []),
      ...(prohibited ? ['art-5'] : []),
      ...(highRisk ? ['art-6', 'annex-iii'] : []),
      ...(operatorRoles.includes('provider') ? ['art-16'] : []),
      ...(operatorRoles.includes('deployer') ? ['art-26'] : []),
      ...(operatorRoles.includes('importer') ? ['art-16'] : []),
      ...(transparencyTriggers.length > 0 ? ['art-50'] : []),
      ...(highRisk ? ['art-49'] : []),
    ];

    const reasoningTrace = [
      {
        step: 1,
        code: 'ai-system-threshold',
        summary: aiSystem
          ? 'The submitted functionality is being treated as an AI system.'
          : 'The submitted functionality is not being treated as an AI system.',
      },
      {
        step: 2,
        code: 'eu-scope',
        summary: usedInEu
          ? 'The system is being treated as used in or placed on the EU market.'
          : 'No EU use or market connection was identified.',
      },
      {
        step: 3,
        code: 'classification',
        summary: !aiSystem
          ? 'The checker stops here because the submitted functionality is not being treated as an AI system.'
          : !usedInEu
          ? 'The checker stops here because no EU use or market connection was identified.'
          : prohibited
          ? 'A prohibited-use trigger was selected.'
          : highRisk
          ? 'A high-risk trigger was selected.'
          : transparencyTriggers.length > 0
          ? 'A transparency-only trigger was selected.'
          : 'No prohibited or high-risk trigger was selected in this quick audit.',
      },
      {
        step: 4,
        code: 'framework-context',
        summary: otherFrameworks.length
          ? `Additional framework alignment was requested for ${otherFrameworks.join(', ')}.`
          : 'No additional framework alignment was selected.',
      },
      {
        step: 5,
        code: 'readiness',
        summary:
          outOfScope
            ? 'No further readiness assessment was required for this result.'
            : missingEvidence.length > 0
            ? 'The audit found missing controls or missing documentation that should be fixed.'
            : 'No major readiness gap was identified from the submitted answers.',
      },
    ];

    const summarySentence = !aiSystem
      ? 'This quick checker is not applicable because the submitted functionality was not identified as an AI system.'
      : !usedInEu
      ? 'This quick checker did not identify an EU-facing compliance trigger because no EU use or market connection was selected.'
      : prohibited
      ? 'This result indicates a likely non-compliant or prohibited use that should be escalated immediately.'
      : highRisk || missingEvidence.length > 0
      ? 'This result indicates compliance work is still needed before the system should be treated as aligned.'
      : 'This result indicates no major compliance trigger or evidence gap was identified from the submitted answers.';

    return {
      result_kind: resultKind,
      in_scope: inScope && !excluded,
      excluded,
      prohibited,
      high_risk: highRisk,
      transparency_obligations: transparencyTriggers,
      gpai,
      gpai_systemic_risk: gpaiSystemicRisk,
      operator_roles: operatorRoles,
      other_frameworks: otherFrameworks,
      considered_provider: consideredProvider,
      obligations,
      next_required_documents: Array.from(new Set(nextDocuments)),
      missing_evidence: Array.from(new Set(missingEvidence)),
      legal_references: Array.from(new Set(legalReferences)),
      reasoning_trace: reasoningTrace,
      summary_sentence: summarySentence,
      ambiguity_flags: [],
      legal_disclaimer: true,
    };
  }

  private buildSummary(result: Record<string, unknown>) {
    return {
      in_scope: result.in_scope === true,
      high_risk: result.high_risk === true,
      prohibited: result.prohibited === true,
      gpai: result.gpai === true,
      operator_roles: Array.isArray(result.operator_roles) ? result.operator_roles : [],
    };
  }

  private generateOpaqueId(byteLength: number) {
    return randomBytes(byteLength).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
