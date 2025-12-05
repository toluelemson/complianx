#!/usr/bin/env bash
set -euo pipefail

# Reset the database and ensure the power admin user exists.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}/backend"

echo "Dropping and recreating database (prisma migrate reset)..."
npx prisma migrate reset --force

echo "Seeding power admin user..."
POWER_ADMIN_EMAIL="toluwhani@gmail.com"
POWER_ADMIN_PASSWORD="${POWER_ADMIN_PASSWORD:-ChangeMe123!}"

node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const email = process.env.POWER_ADMIN_EMAIL || 'toluwhani@gmail.com';
const password = process.env.POWER_ADMIN_PASSWORD || 'ChangeMe123!';

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    console.log(`Created power admin ${email}`);
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: 'ADMIN', emailVerified: true },
    });
    console.log(`Updated power admin ${email}`);
  }
  await prisma.userCompany.updateMany({
    where: { userId: existing?.id },
    data: { role: 'ADMIN' },
  });
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE

echo "Done."
