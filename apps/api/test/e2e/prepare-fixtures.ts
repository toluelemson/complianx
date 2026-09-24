import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error('E2E fixtures require a dedicated *_test DATABASE_URL');
  }
  const company = await prisma.company.upsert({
    where: { id: 'e2e-company' },
    update: {},
    create: { id: 'e2e-company', name: 'E2E Test Company' },
  });
  const passwordHash = await bcrypt.hash('e2e-test-password', 4);
  const user = await prisma.user.upsert({
    where: { id: 'e2e-user' },
    update: {
      passwordHash,
      role: Role.ADMIN,
      companyId: company.id,
      defaultCompanyId: company.id,
      emailVerified: true,
    },
    create: {
      id: 'e2e-user',
      email: 'e2e-user@example.invalid',
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
      companyId: company.id,
      defaultCompanyId: company.id,
    },
  });
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: Role.ADMIN },
    create: { userId: user.id, companyId: company.id, role: Role.ADMIN },
  });
  const project = await prisma.project.upsert({
    where: { id: 'e2e-project' },
    update: {
      name: 'E2E support assistant',
      companyId: company.id,
      ownerId: user.id,
      intendedUse: 'Answers routine customer support questions.',
      deploymentGeography: 'European Union',
    },
    create: {
      id: 'e2e-project',
      name: 'E2E support assistant',
      companyId: company.id,
      ownerId: user.id,
      intendedUse: 'Answers routine customer support questions.',
      deploymentGeography: 'European Union',
    },
  });
  await prisma.aiSystemObligation.updateMany({
    where: { projectId: project.id },
    data: { classificationResultId: null },
  });
  await prisma.assessment.deleteMany({ where: { projectId: project.id } });
  const section = await prisma.section.findFirst({
    where: { projectId: project.id, name: 'system_overview' },
  });
  const content = {
    purpose: 'Support customers with common product questions.',
    intendedUsers: 'Customer-support agents and customers.',
    deploymentContext: 'European Union web application.',
  };
  if (section) {
    await prisma.section.update({
      where: { id: section.id },
      data: { content },
    });
  } else {
    await prisma.section.create({
      data: { name: 'system_overview', projectId: project.id, content },
    });
  }
  const pack = await prisma.compliancePackVersion.findFirst({
    where: { key: 'eu-ai-act', status: 'PUBLISHED' },
  });
  if (!pack) {
    throw new Error('E2E fixtures require a published EU AI Act pack');
  }
  const obligation = await prisma.obligation.upsert({
    where: {
      packVersionId_key: { packVersionId: pack.id, key: 'e2e-requirement' },
    },
    update: { title: 'E2E requirement control' },
    create: {
      packVersionId: pack.id,
      key: 'e2e-requirement',
      title: 'E2E requirement control',
      description: 'A deterministic requirement for browser testing.',
    },
  });
  await prisma.aiSystemObligation.upsert({
    where: {
      projectId_obligationId: {
        projectId: project.id,
        obligationId: obligation.id,
      },
    },
    update: { ownerId: user.id, priority: 'MEDIUM' },
    create: {
      projectId: project.id,
      obligationId: obligation.id,
      ownerId: user.id,
      priority: 'MEDIUM',
    },
  });
}

main().finally(() => prisma.$disconnect());
