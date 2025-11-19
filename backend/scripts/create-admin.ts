import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, companyId] = process.argv;
  if (!email || !password || !companyId) {
    console.error(
      'Usage: ts-node -r ts-node/register scripts/create-admin.ts <email> <password> <companyId>',
    );
    process.exit(1);
  }
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    console.error('User already exists with that email');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      companyId,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin user ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
