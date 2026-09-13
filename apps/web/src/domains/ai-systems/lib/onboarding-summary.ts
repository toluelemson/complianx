import type { PreliminaryClassification } from '../api';

const ROLE_LABELS: Record<string, string> = {
  provider: 'Provider',
  deployer: 'Deployer',
  importer: 'Importer',
  distributor: 'Distributor',
  authorized_representative: 'Authorised representative',
};

const CATEGORY_LABELS: Record<string, string> = {
  not_applicable: 'Likely not applicable',
  out_of_scope: 'Likely outside scope',
  prohibited: 'Potential prohibited practice',
  action_required: 'Action required',
  likely_compliant: 'No immediate gap identified',
  high_risk: 'High-risk',
};

export function summarizeOnboarding(
  classification: PreliminaryClassification,
  requirements: Array<{ approvalState: string }>,
) {
  const roles = classification.resultSnapshot?.operator_roles ?? [];
  const category = classification.resultSnapshot?.prohibited
    ? 'Potential prohibited practice'
    : classification.resultSnapshot?.high_risk
      ? 'High-risk'
      : (CATEGORY_LABELS[classification.category.toLowerCase()] ??
        humanize(classification.category));
  return {
    role: roles.length
      ? roles.map((role) => ROLE_LABELS[role] ?? humanize(role)).join(', ')
      : 'Needs human confirmation',
    category,
    requirementCount: requirements.length,
    needsAttention: requirements.filter(
      (requirement) => requirement.approvalState !== 'APPROVED',
    ).length,
  };
}

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
