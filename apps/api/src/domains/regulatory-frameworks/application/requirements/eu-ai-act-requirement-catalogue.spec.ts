import { TrustworthinessPrinciple } from '@prisma/client';
import {
  ensureRequirementCatalogueItem,
  EU_AI_ACT_REQUIREMENT_CATALOGUE,
  getEuAiActRequirement,
} from './eu-ai-act-requirement-catalogue';

describe('EU AI Act requirement catalogue', () => {
  it('defines catalogue entries with only the seven supported principles', () => {
    const supported = new Set(Object.values(TrustworthinessPrinciple));
    expect(supported.size).toBe(7);
    for (const entry of Object.values(EU_AI_ACT_REQUIREMENT_CATALOGUE)) {
      expect(supported.has(entry.principle)).toBe(true);
      expect(entry.id).toMatch(/^EU-AIA-/);
      expect(entry.text).toBeTruthy();
      expect(entry.article).toMatch(/^Art\./);
    }
  });

  it('reuses an identical permanent ID without changing its text', async () => {
    const entry = getEuAiActRequirement('transparency');
    const stored = {
      id: entry.id,
      text: entry.text,
      aiActArticle: entry.article,
      trustworthinessPrinciple: entry.principle,
      architectureElements: [...entry.architectureElements],
      verificationMethod: entry.verificationMethod,
      createdAt: new Date(),
    };
    const client = {
      requirementCatalogueItem: {
        findUnique: jest.fn().mockResolvedValue(stored),
        create: jest.fn(),
      },
    };

    await expect(
      ensureRequirementCatalogueItem(client as never, entry),
    ).resolves.toBe(stored);
    expect(client.requirementCatalogueItem.create).not.toHaveBeenCalled();
  });

  it('rejects a second text for an existing permanent ID', async () => {
    const entry = getEuAiActRequirement('transparency');
    const client = {
      requirementCatalogueItem: {
        findUnique: jest.fn().mockResolvedValue({
          id: entry.id,
          text: 'Different requirement text',
          aiActArticle: entry.article,
          trustworthinessPrinciple: entry.principle,
          architectureElements: [...entry.architectureElements],
          verificationMethod: entry.verificationMethod,
        }),
        create: jest.fn(),
      },
    };

    await expect(
      ensureRequirementCatalogueItem(client as never, entry),
    ).rejects.toThrow(
      `Requirement catalogue ID ${entry.id} is already bound to different metadata`,
    );
  });
});
