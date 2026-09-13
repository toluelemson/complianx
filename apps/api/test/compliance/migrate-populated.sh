#!/bin/bash
set -euo pipefail
node -e 'const u = new URL(process.env.DATABASE_URL); if (!["localhost", "127.0.0.1"].includes(u.hostname) || !u.pathname.endsWith("_test")) throw new Error("Dedicated local *_test database required")' 
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/0001_init/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "User" (id,email,"passwordHash","updatedAt") VALUES ('legacy-user','legacy@example.invalid','test-only',now());
INSERT INTO "Project" (id,name,"ownerId","updatedAt") VALUES ('legacy-project','Populated migration fixture','legacy-user',now());
INSERT INTO "Section" (id,name,content,"projectId") VALUES ('legacy-section','Legacy section','{}','legacy-project');
INSERT INTO "Document" (id,type,url,"projectId") VALUES ('legacy-document','legacy','legacy.pdf','legacy-project');
SQL
corepack pnpm exec prisma migrate resolve --applied 0001_init
corepack pnpm exec prisma migrate deploy
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT id, name FROM "Project" WHERE id = '\''legacy-project'\'';'
corepack pnpm exec prisma migrate status
