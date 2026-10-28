CREATE TYPE "DocumentQuotaReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED');

CREATE TABLE "DocumentQuotaReservation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "DocumentQuotaReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "committedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "operationKey" TEXT,
  CONSTRAINT "DocumentQuotaReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentQuotaReservation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DocumentQuotaReservation_operationKey_key" ON "DocumentQuotaReservation"("operationKey");
CREATE INDEX "DocumentQuotaReservation_companyId_month_status_expiresAt_idx" ON "DocumentQuotaReservation"("companyId", "month", "status", "expiresAt");

INSERT INTO "DocumentQuotaReservation" ("id", "companyId", "month", "amount", "status", "createdAt", "expiresAt", "operationKey")
SELECT md5("companyId" || ':' || "month" || ':legacy')::uuid, "companyId", "month", "docsReserved", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour', 'legacy:' || "companyId" || ':' || "month"
FROM "CompanyUsage"
WHERE "docsReserved" > 0;

ALTER TABLE "CompanyUsage" DROP COLUMN "docsReserved";

ALTER TABLE "Document" ADD COLUMN "operationKey" TEXT;
CREATE UNIQUE INDEX "Document_operationKey_key" ON "Document"("operationKey");
