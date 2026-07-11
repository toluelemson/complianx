import { Injectable } from '@nestjs/common';

type SectionInput = {
  name: string;
  content: Record<string, unknown>;
  artifacts?: Array<unknown>;
};

type Requirement = {
  section: string;
  field: string;
  label: string;
  weight: number;
  critical?: boolean;
};

const REQUIREMENTS: Requirement[] = [
  {
    section: 'system_overview',
    field: 'purpose',
    label: 'System purpose',
    weight: 10,
    critical: true,
  },
  {
    section: 'system_overview',
    field: 'intendedUsers',
    label: 'Intended users',
    weight: 8,
    critical: true,
  },
  {
    section: 'system_overview',
    field: 'deploymentContext',
    label: 'Deployment context',
    weight: 8,
    critical: true,
  },
  {
    section: 'model_info',
    field: 'modelType',
    label: 'Model type',
    weight: 6,
    critical: true,
  },
  {
    section: 'model_info',
    field: 'trainingData',
    label: 'Training data',
    weight: 8,
    critical: true,
  },
  { section: 'model_info', field: 'metrics', label: 'Key metrics', weight: 6 },
  {
    section: 'data_governance',
    field: 'dataSources',
    label: 'Data sources',
    weight: 8,
    critical: true,
  },
  {
    section: 'data_governance',
    field: 'qualityChecks',
    label: 'Quality checks',
    weight: 6,
  },
  {
    section: 'data_governance',
    field: 'privacy',
    label: 'Privacy controls',
    weight: 6,
  },
  {
    section: 'risk_assessment',
    field: 'risks',
    label: 'Key risks',
    weight: 10,
    critical: true,
  },
  {
    section: 'risk_assessment',
    field: 'likelihood',
    label: 'Likelihood',
    weight: 6,
  },
  {
    section: 'risk_assessment',
    field: 'impact',
    label: 'Potential impact',
    weight: 8,
    critical: true,
  },
  {
    section: 'human_oversight',
    field: 'roles',
    label: 'Oversight roles',
    weight: 8,
    critical: true,
  },
  {
    section: 'human_oversight',
    field: 'escalations',
    label: 'Escalation process',
    weight: 8,
    critical: true,
  },
  {
    section: 'monitoring',
    field: 'monitoringPlan',
    label: 'Monitoring plan',
    weight: 8,
    critical: true,
  },
  {
    section: 'monitoring',
    field: 'maintenance',
    label: 'Maintenance cadence',
    weight: 6,
  },
];

@Injectable()
export class ReadinessService {
  assess(sections: SectionInput[]) {
    const sectionMap = new Map(
      sections.map((section) => [section.name, section]),
    );
    const maxScore =
      REQUIREMENTS.reduce((sum, requirement) => sum + requirement.weight, 0) +
      10;
    let score = 0;

    const missingCriticalFields: string[] = [];
    const weakSections = new Set<string>();

    for (const requirement of REQUIREMENTS) {
      const section = sectionMap.get(requirement.section);
      const value = section?.content?.[requirement.field];
      if (this.hasFieldValue(value)) {
        score += requirement.weight;
      } else {
        weakSections.add(this.formatSectionName(requirement.section));
        if (requirement.critical) {
          missingCriticalFields.push(requirement.label);
        }
      }
    }

    const artifactCount = sections.reduce(
      (total, section) =>
        total +
        (Array.isArray(section.artifacts) ? section.artifacts.length : 0),
      0,
    );
    if (artifactCount > 0) {
      score += Math.min(10, artifactCount * 2);
    } else {
      weakSections.add('Evidence attachments');
    }

    const normalizedScore = Math.round((score / maxScore) * 100);
    const status =
      normalizedScore >= 75 && missingCriticalFields.length === 0
        ? 'ready'
        : normalizedScore >= 45
          ? 'partial'
          : 'insufficient';
    const generationMode =
      status === 'ready' ? 'full' : status === 'partial' ? 'draft' : 'gap_only';

    return {
      score: normalizedScore,
      status,
      generationMode,
      missingCriticalFields,
      weakSections: Array.from(weakSections),
      summary:
        status === 'ready'
          ? 'The project has enough structured information to generate a defensible document set.'
          : status === 'partial'
            ? 'The project can generate draft documentation, but several gaps still need evidence before the output should be treated as audit-ready.'
            : 'The project does not yet have enough structured information for defensible document generation.',
    };
  }

  private hasFieldValue(value: unknown) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object')
      return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
  }

  private formatSectionName(name: string) {
    return name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
