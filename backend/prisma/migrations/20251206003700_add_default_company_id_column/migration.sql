-- Ensure defaultCompanyId exists for User; guards deployments where prior migration was skipped
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCompanyId" TEXT;
