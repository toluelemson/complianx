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
    update: { passwordHash, companyId: company.id, defaultCompanyId: company.id },
    create: {
      id: 'e2e-user',
      email: 'e2e-user@example.invalid',
      passwordHash,
      companyId: company.id,
      defaultCompanyId: company.id,
    },
  });
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: Role.ADMIN },
    create: { userId: user.id, companyId: company.id, role: Role.ADMIN },
  });
}

main().finally(() => prisma.$disconnect());
