import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scriptDir = dirname(fileURLToPath(import.meta.url));

const seedDir = join(
  scriptDir,
  '..',
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

async function main() {
  const version = '2026.03.v2';
  const questionPack = loadJson('eu-ai-act-v2.questions.json');
  const rulePack = loadJson('eu-ai-act-v2.rules.json');
  const legalRegistry = loadJson('eu-ai-act-v2.legal.json');

  const existingPublished = await prisma.compliancePackVersion.findFirst({
    where: {
      key: 'eu-ai-act',
      version,
    },
  });

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
      changelog: 'Generic compliance questionnaire pack for simple company checks.',
      questionPack,
      rulePack,
      legalRegistry,
    },
    update: {
      status: 'PUBLISHED',
      publishedAt: existingPublished?.publishedAt ?? new Date(),
      changelog: 'Generic compliance questionnaire pack for simple company checks.',
      questionPack,
      rulePack,
      legalRegistry,
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
