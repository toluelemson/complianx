ALTER TABLE "ClassificationResult"
  ADD COLUMN "frameworkKey" TEXT NOT NULL DEFAULT 'eu-ai-act',
  ADD COLUMN "regulatoryContentVersion" TEXT,
  ADD COLUMN "ruleSetVersion" TEXT,
  ADD COLUMN "inputFacts" JSONB,
  ADD COLUMN "rulesTriggered" JSONB,
  ADD COLUMN "missingInformation" JSONB,
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reviewerId" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "humanOverride" JSONB;

CREATE TYPE "ClassificationReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'OVERRIDDEN');
ALTER TABLE "ClassificationResult" ALTER COLUMN "reviewStatus" DROP DEFAULT;
ALTER TABLE "ClassificationResult" ALTER COLUMN "reviewStatus" TYPE "ClassificationReviewStatus" USING "reviewStatus"::"ClassificationReviewStatus";
ALTER TABLE "ClassificationResult" ALTER COLUMN "reviewStatus" SET DEFAULT 'PENDING'::"ClassificationReviewStatus";
