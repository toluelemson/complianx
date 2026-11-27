import { Prisma, TrustworthinessPrinciple } from '@prisma/client';

export type EuAiActRequirementCatalogueEntry = {
  id: string;
  key: string;
  text: string;
  article: string;
  principle: TrustworthinessPrinciple;
  architectureElements: readonly string[];
  verificationMethod: string;
};

const entries = {
  provider: {
    id: 'EU-AIA-ART-16-PROVIDER',
    key: 'provider-governance',
    text: 'Provider governance and documentation',
    article: 'Art. 16',
    principle: TrustworthinessPrinciple.RISK_MANAGEMENT,
    architectureElements: ['Risk management system', 'Technical documentation'],
    verificationMethod:
      'Review approved risk-management and technical-documentation records',
  },
  deployer: {
    id: 'EU-AIA-ART-26-DEPLOYER',
    key: 'deployer-oversight',
    text: 'Deployer oversight and use controls',
    article: 'Art. 26',
    principle: TrustworthinessPrinciple.HUMAN_OVERSIGHT,
    architectureElements: [
      'Human oversight procedure',
      'Operational instructions',
    ],
    verificationMethod:
      'Test oversight controls and review operator training records',
  },
  importer: {
    id: 'EU-AIA-ART-23-IMPORTER',
    key: 'importer-controls',
    text: 'Importer verification controls',
    article: 'Art. 23',
    principle: TrustworthinessPrinciple.LIFECYCLE_MONITORING,
    architectureElements: ['Supplier verification', 'Market-placement records'],
    verificationMethod: 'Review supplier declarations and importer checks',
  },
  transparency: {
    id: 'EU-AIA-ART-50-TRANSPARENCY',
    key: 'transparency-notice',
    text: 'Transparency notice for affected people',
    article: 'Art. 50',
    principle: TrustworthinessPrinciple.TRANSPARENCY_AND_LOGGING,
    architectureElements: ['User interface notice', 'Interaction logging'],
    verificationMethod:
      'Inspect the user notice and verify disclosure in a representative interaction',
  },
  gpai: {
    id: 'EU-AIA-ART-53-GPAI',
    key: 'gpai-documentation',
    text: 'GPAI model documentation',
    article: 'Art. 53',
    principle: TrustworthinessPrinciple.TRANSPARENCY_AND_LOGGING,
    architectureElements: ['Model documentation', 'Downstream-use register'],
    verificationMethod: 'Review model documentation and downstream-use records',
  },
} as const satisfies Record<string, EuAiActRequirementCatalogueEntry>;

export const EU_AI_ACT_REQUIREMENT_CATALOGUE = Object.freeze(entries);

export function getEuAiActRequirement(
  role: string,
): EuAiActRequirementCatalogueEntry {
  const known = entries[role as keyof typeof entries];
  if (known) return known;
  const suffix = role.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase() || 'GENERAL';
  return {
    id: `EU-AIA-ART-9-${suffix}`,
    key: `general-${role || 'general'}`,
    text: 'EU AI Act risk-management control',
    article: 'Art. 9',
    principle: TrustworthinessPrinciple.RISK_MANAGEMENT,
    architectureElements: ['Risk register'],
    verificationMethod:
      'Review the current risk register and mitigation evidence',
  };
}

type CatalogueClient = Pick<
  Prisma.TransactionClient,
  'requirementCatalogueItem'
>;

export async function ensureRequirementCatalogueItem(
  client: CatalogueClient,
  entry: EuAiActRequirementCatalogueEntry,
) {
  const existing = await client.requirementCatalogueItem.findUnique({
    where: { id: entry.id },
  });
  if (existing) {
    const elements = Array.isArray(existing.architectureElements)
      ? existing.architectureElements
      : [];
    const matches =
      existing.text === entry.text &&
      existing.aiActArticle === entry.article &&
      existing.trustworthinessPrinciple === entry.principle &&
      existing.verificationMethod === entry.verificationMethod &&
      JSON.stringify(elements) === JSON.stringify(entry.architectureElements);
    if (!matches) {
      throw new Error(
        `Requirement catalogue ID ${entry.id} is already bound to different metadata`,
      );
    }
    return existing;
  }
  return client.requirementCatalogueItem.create({
    data: {
      id: entry.id,
      text: entry.text,
      aiActArticle: entry.article,
      trustworthinessPrinciple: entry.principle,
      architectureElements: [...entry.architectureElements],
      verificationMethod: entry.verificationMethod,
    },
  });
}
