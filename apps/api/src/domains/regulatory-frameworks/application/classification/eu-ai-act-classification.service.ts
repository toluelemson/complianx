import { Injectable, NotFoundException } from '@nestjs/common';
import { CompliancePackVersion, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';

type Answer = { questionKey: string; normalizedJson: unknown };

@Injectable()
export class EuAiActClassificationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePack(requestedVersion?: string) {
    const pack = await this.prisma.compliancePackVersion.findFirst({
      where: requestedVersion
        ? { key: 'eu-ai-act', version: requestedVersion }
        : { key: 'eu-ai-act', status: 'PUBLISHED' },
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

  evaluateAnswers(answers: Answer[], pack?: CompliancePackVersion) {
    const map = Object.fromEntries(
      answers.map((answer) => [answer.questionKey, answer.normalizedJson]),
    ) as Record<string, any>;
    const roles =
      typeof map.company_role === 'string' && map.company_role.length > 0
        ? [map.company_role]
        : Array.isArray(map.entity_roles)
          ? map.entity_roles
          : [];
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
    const prohibited = prohibitedUseCases.length > 0;
    const highRisk = !prohibited && highRiskContexts.length > 0;
    const outOfScope = !inScope;
    const humanOversightReady = map.human_oversight_ready !== false;
    const riskControlsReady = map.risk_controls_ready !== false;
    const documentationReady = map.documentation_ready !== false;
    const conformityReady = highRisk
      ? map.conformity_process_ready === true
      : true;
    const resultKind = !aiSystem
      ? 'not_applicable'
      : !usedInEu
        ? 'out_of_scope'
        : prohibited
          ? 'prohibited'
          : highRisk ||
              !humanOversightReady ||
              !riskControlsReady ||
              !documentationReady ||
              !conformityReady
            ? 'action_required'
            : 'likely_compliant';

    const obligations: Array<Record<string, unknown>> = [];
    if (!outOfScope && roles.includes('provider')) {
      obligations.push({
        role: 'provider',
        title: highRisk
          ? 'Provider obligations for a high-risk AI use case should be completed and evidenced.'
          : 'Provider governance and documentation should be maintained.',
      });
    }
    if (!outOfScope && roles.includes('deployer')) {
      obligations.push({
        role: 'deployer',
        title:
          'Deployer oversight, human review, and use-context controls should be in place.',
      });
    }
    if (!outOfScope && roles.includes('importer')) {
      obligations.push({
        role: 'importer',
        title:
          'Importer checks and market-placement controls should be documented',
      });
    }
    if (!outOfScope && transparencyTriggers.length > 0) {
      obligations.push({
        role: 'transparency',
        title: 'Users should receive the relevant AI transparency notice.',
      });
    }

    const missingEvidence: string[] = [];
    if (!outOfScope && !humanOversightReady)
      missingEvidence.push('Documented human oversight for key decisions');
    if (!outOfScope && !riskControlsReady)
      missingEvidence.push('Documented risk controls and ongoing monitoring');
    if (!outOfScope && !documentationReady)
      missingEvidence.push('Core compliance documentation and evidence pack');
    if (!outOfScope && highRisk && !conformityReady)
      missingEvidence.push('High-risk conformity and registration readiness');
    if (!outOfScope && prohibited)
      missingEvidence.push(
        'Prohibited-use escalation record and remediation plan',
      );

    const legalReferences = [
      ...(inScope ? ['art-2-scope', 'art-3-ai-system'] : []),
      ...(prohibited ? ['art-5'] : []),
      ...(highRisk ? ['art-6', 'annex-iii', 'art-49'] : []),
      ...(roles.includes('provider') ? ['art-16'] : []),
      ...(roles.includes('deployer') ? ['art-26'] : []),
      ...(roles.includes('importer') ? ['art-16'] : []),
      ...(transparencyTriggers.length > 0 ? ['art-50'] : []),
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
        summary: prohibited
          ? 'A prohibited-use trigger was selected.'
          : highRisk
            ? 'A high-risk trigger was selected.'
            : 'No prohibited or high-risk trigger was selected in this quick audit.',
      },
      {
        step: 4,
        code: 'readiness',
        summary:
          missingEvidence.length > 0
            ? 'The audit found missing controls or missing documentation that should be fixed.'
            : 'No major readiness gap was identified from the submitted answers.',
      },
    ];
    const result = {
      result_kind: resultKind,
      in_scope: inScope,
      excluded: false,
      prohibited,
      high_risk: highRisk,
      transparency_obligations: transparencyTriggers,
      gpai: false,
      gpai_systemic_risk: false,
      operator_roles: roles,
      other_frameworks: otherFrameworks,
      considered_provider: false,
      obligations,
      missing_evidence: Array.from(new Set(missingEvidence)),
      legal_references: Array.from(new Set(legalReferences)),
      reasoning_trace: reasoningTrace,
      ambiguity_flags: [],
      legal_disclaimer: true,
      pack_version: pack?.version,
    };
    return result as Record<string, unknown> & {
      reasoning_trace: unknown;
      legal_references: unknown;
      ambiguity_flags: unknown;
    };
  }

  toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
