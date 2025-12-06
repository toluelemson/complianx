-- Add reviews usage tracking to enforce per-plan review limits
ALTER TABLE "CompanyUsage" ADD COLUMN IF NOT EXISTS "reviewsLogged" INTEGER NOT NULL DEFAULT 0;
