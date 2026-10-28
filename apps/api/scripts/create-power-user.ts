import bcrypt from 'bcrypt';
import { Plan, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'power@neuraldocx.local';
const DEFAULT_PASSWORD = 'PowerUser123!';
const DEFAULT_COMPANY = 'NeuralDocx Dev Workspace';

function requiredProductionValue(name: string, value: string | undefined) {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} must be set when creating a power user in production`);
  }

  return value;
}

async function main() {
  const [, , rawEmail, rawPassword, rawCompanyName] = process.argv;

  const email = (
    requiredProductionValue('POWER_USER_EMAIL', process.env.POWER_USER_EMAIL) ??
    process.env.POWER_USER_EMAIL ??
    rawEmail ??
    DEFAULT_EMAIL
  )
    .trim()
    .toLowerCase();
  const password = (
    requiredProductionValue('POWER_USER_PASSWORD', process.env.POWER_USER_PASSWORD) ??
    process.env.POWER_USER_PASSWORD ??
    rawPassword ??
    DEFAULT_PASSWORD
  ).trim();
  const companyName = (
    process.env.POWER_USER_COMPANY ?? rawCompanyName ?? DEFAULT_COMPANY
  ).trim();

  if (!email) {
    throw new Error('POWER_USER_EMAIL cannot be empty');
  }
  if (password.length < 12) {
    throw new Error('POWER_USER_PASSWORD must be at least 12 characters long');
  }

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

  console.log('Power user ready');
  console.log(`Email: ${email}`);
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
