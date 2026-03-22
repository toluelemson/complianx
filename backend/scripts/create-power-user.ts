import bcrypt from 'bcrypt';
import { Plan, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'power@neuraldocx.local';
const DEFAULT_PASSWORD = 'PowerUser123!';
const DEFAULT_COMPANY = 'NeuralDocx Dev Workspace';

async function main() {
  const [, , rawEmail, rawPassword, rawCompanyName] = process.argv;

  const email = (rawEmail ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = (rawPassword ?? DEFAULT_PASSWORD).trim();
  const companyName = (rawCompanyName ?? DEFAULT_COMPANY).trim();

  const passwordHash = await bcrypt.hash(password, 12);

  const existingCompany = await prisma.company.findFirst({
    where: { name: companyName },
  });

  const company = existingCompany
    ? await prisma.company.update({
        where: { id: existingCompany.id },
        data: {
          plan: Plan.ENTERPRISE,
          billingEmail: email,
        },
      })
    : await prisma.company.create({
        data: {
          name: companyName,
          plan: Plan.ENTERPRISE,
          billingEmail: email,
        },
      });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.ADMIN,
      companyId: company.id,
      defaultCompanyId: company.id,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
      companyId: company.id,
      defaultCompanyId: company.id,
      emailVerified: true,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      role: Role.ADMIN,
    },
    create: {
      userId: user.id,
      companyId: company.id,
      role: Role.ADMIN,
    },
  });

  console.log('Dev power user ready');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Company: ${company.name}`);
  console.log(`Company ID: ${company.id}`);
  console.log(`User ID: ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
