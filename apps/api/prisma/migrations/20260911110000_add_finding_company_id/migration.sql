ALTER TABLE "Finding" ADD COLUMN "companyId" TEXT;

CREATE INDEX "Finding_companyId_idx" ON "Finding"("companyId");

ALTER TABLE "Finding" ADD CONSTRAINT "Finding_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
