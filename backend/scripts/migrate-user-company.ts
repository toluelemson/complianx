import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { companyId: { not: null } },
    select: {
      id: true,
      companyId: true,
      role: true,
      defaultCompanyId: true,
    },
  });
  let created = 0;
  for (const user of users) {
    const companyId = user.companyId!;
    const membership = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
    });
    if (membership) {
      continue;
    }
    await prisma.userCompany.create({
      data: {
        userId: user.id,
        companyId,
        role: user.role,
      },
    });
    if (!user.defaultCompanyId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultCompanyId: companyId },
      });
    }
    created += 1;
  }
  console.log(`Migrated ${created} user memberships.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
