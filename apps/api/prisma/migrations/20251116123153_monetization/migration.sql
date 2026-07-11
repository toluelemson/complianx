-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CompanyUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "docsGenerated" INTEGER NOT NULL DEFAULT 0,
    "trustAnalyses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUsage_companyId_month_key" ON "CompanyUsage"("companyId", "month");

-- AddForeignKey
ALTER TABLE "CompanyUsage" ADD CONSTRAINT "CompanyUsage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
