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
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const company = await prisma.company.create({
      data: { name: "Toluwhani's Workspace", billingEmail: email },
    });
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        companyId: company.id,
        defaultCompanyId: company.id,
      },
    });
    await prisma.userCompany.create({
      data: { userId: user.id, companyId: company.id, role: 'ADMIN' },
    });
    console.log(`Created power admin ${email} with company ${company.id}`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, role: 'ADMIN', emailVerified: true },
    });
    const existingMembership = await prisma.userCompany.findFirst({
      where: { userId: user.id },
    });
    let companyId = existingMembership?.companyId;
    if (!companyId) {
      const company = await prisma.company.create({
        data: { name: "Toluwhani's Workspace", billingEmail: email },
      });
      await prisma.userCompany.create({
        data: { userId: user.id, companyId: company.id, role: 'ADMIN' },
      });
      companyId = company.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId, defaultCompanyId: companyId },
      });
      console.log(`Created company ${companyId} for ${email}`);
    } else {
      await prisma.userCompany.updateMany({
        where: { userId: user.id },
        data: { role: 'ADMIN' },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultCompanyId: user.defaultCompanyId ?? companyId, companyId: user.companyId ?? companyId },
      });
    }
    console.log(`Updated power admin ${email}`);
  }
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
