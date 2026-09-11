import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

const seedDir = join(
  process.cwd(),
  'src',
  'domains',
  'regulatory-frameworks',
  'infrastructure',
  'public-eu-ai-act',
  'seeds',
);

function loadJson(fileName: string) {
  return JSON.parse(readFileSync(join(seedDir, fileName), 'utf8'));
}

function contentHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function main() {
  const version = '2026.03.v2';
  const questionPack = loadJson('eu-ai-act-v2.questions.json');
  const rulePack = loadJson('eu-ai-act-v2.rules.json');
  const legalRegistry = loadJson('eu-ai-act-v2.legal.json');

  const existingPack = await prisma.compliancePackVersion.findFirst({
    where: {
      key: 'eu-ai-act',
      version,
    },
  });

  if (
    existingPack?.status === 'PUBLISHED' ||
    existingPack?.status === 'DEPRECATED'
  ) {
    console.log(
      `Compliance pack ${version} is already published; leaving it immutable.`,
    );
    return;
  }

  const pack = await prisma.compliancePackVersion.upsert({
    where: {
      key_version: {
        key: 'eu-ai-act',
        version,
      },
    },
    create: {
      key: 'eu-ai-act',
      version,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      changelog:
        'Generic compliance questionnaire pack for simple company checks.',
      questionPack,
      rulePack,
      legalRegistry,
      legalInstrument: 'Regulation (EU) 2024/1689',
      sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
      retrievedAt: new Date(),
      contentHash: contentHash({ questionPack, rulePack, legalRegistry }),
      schemaVersion: 'neuraldocx-pack-1.0.0',
      ruleSetVersion: `classification-rules-${version}`,
      questionnaireVersion: `classification-questionnaire-${version}`,
    },
    update: {
      status: 'PUBLISHED',
      publishedAt: existingPack?.publishedAt ?? new Date(),
      changelog:
        'Generic compliance questionnaire pack for simple company checks.',
      questionPack,
      rulePack,
      legalRegistry,
      legalInstrument: 'Regulation (EU) 2024/1689',
      sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
      retrievedAt: new Date(),
      contentHash: contentHash({ questionPack, rulePack, legalRegistry }),
      schemaVersion: 'neuraldocx-pack-1.0.0',
      ruleSetVersion: `classification-rules-${version}`,
      questionnaireVersion: `classification-questionnaire-${version}`,
    },
  });

  await prisma.auditEvent.create({
    data: {
      entityType: 'CompliancePackVersion',
      entityId: pack.id,
      action: 'PUBLISHED',
      beforeSnapshot: existingPack
        ? { status: existingPack.status, publishedAt: existingPack.publishedAt }
        : undefined,
      packVersion: pack.version,
      afterSnapshot: {
        key: pack.key,
        version: pack.version,
        status: pack.status,
        contentHash: pack.contentHash,
      },
    },
  });

  console.log(
    `Seeded compliance pack ${pack.key}@${pack.version} (${pack.status})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
