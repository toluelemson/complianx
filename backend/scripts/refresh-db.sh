#!/usr/bin/env bash
set -euo pipefail

# Reset the database and ensure the power admin user exists.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${BACKEND_DIR}"

# Load env so DATABASE_URL is available; fallback to local dev URL if missing.
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ".env"
  set +a
fi
export DATABASE_URL="${DATABASE_URL:-postgresql://aicd:aicd@localhost:5432/aicd}"

if [ -z "${DATABASE_URL}" ]; then
  echo "DATABASE_URL is not set; aborting."
  exit 1
fi

echo "Using DATABASE_URL=${DATABASE_URL}"

echo "Dropping and recreating database (prisma migrate reset)..."
npx prisma migrate reset --force

echo "Seeding power admin user..."
export POWER_ADMIN_EMAIL="${POWER_ADMIN_EMAIL:-toluwhani@gmail.com}"
export POWER_ADMIN_PASSWORD="${POWER_ADMIN_PASSWORD:-ChangeMe123!}"

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
    user = await prisma.user.create({
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
      where: { id: user.id },
      data: { passwordHash, role: 'ADMIN', emailVerified: true },
    });
    console.log(`Updated power admin ${email}`);
  }
  await prisma.userCompany.updateMany({
    where: { userId: user.id },
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

echo "Clearing app logs..."
ROOT_DIR="$(cd "${BACKEND_DIR}/.." && pwd)"
rm -f "${ROOT_DIR}/backend.log" "${ROOT_DIR}/frontend.log"

echo "Done."
