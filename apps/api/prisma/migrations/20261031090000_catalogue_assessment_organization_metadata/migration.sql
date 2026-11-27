CREATE TYPE "CompanyAiActRole" AS ENUM ('PROVIDER', 'DEPLOYER');
CREATE TYPE "TrustworthinessPrinciple" AS ENUM (
  'RISK_MANAGEMENT',
  'DATA_AND_MODEL_GOVERNANCE',
  'TRANSPARENCY_AND_LOGGING',
  'HUMAN_OVERSIGHT',
  'ACCURACY_AND_ROBUSTNESS',
  'CYBERSECURITY',
  'LIFECYCLE_MONITORING'
);

ALTER TABLE "Company"
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "aiActRole" "CompanyAiActRole";

ALTER TABLE "Assessment"
  ADD COLUMN "weightingChoice" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "targetBand" TEXT NOT NULL DEFAULT 'READY',
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Obligation"
  ADD COLUMN "catalogueId" TEXT,
  ADD COLUMN "trustworthinessPrinciple" "TrustworthinessPrinciple",
  ADD COLUMN "aiActArticle" TEXT,
  ADD COLUMN "architectureElements" JSONB,
  ADD COLUMN "verificationMethod" TEXT;

UPDATE "Obligation"
SET
  "catalogueId" = 'EU-AIA-LEGACY-' || "id",
  "trustworthinessPrinciple" = 'RISK_MANAGEMENT',
  "aiActArticle" = COALESCE("legalReference", 'EU AI Act'),
  "architectureElements" = '["Governance documentation"]'::jsonb,
  "verificationMethod" = 'Documented human review';

ALTER TABLE "Obligation"
  ALTER COLUMN "catalogueId" SET NOT NULL,
  ALTER COLUMN "trustworthinessPrinciple" SET NOT NULL;

CREATE UNIQUE INDEX "Obligation_catalogueId_key" ON "Obligation"("catalogueId");

CREATE TABLE "AssessmentRequirementRow" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "obligationId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "score" DOUBLE PRECISION,
  "state" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "rationale" TEXT,
  "evidenceLinks" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentRequirementRow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentRequirementRow_assessmentId_obligationId_key" ON "AssessmentRequirementRow"("assessmentId", "obligationId");
CREATE INDEX "AssessmentRequirementRow_assessmentId_state_idx" ON "AssessmentRequirementRow"("assessmentId", "state");
ALTER TABLE "AssessmentRequirementRow" ADD CONSTRAINT "AssessmentRequirementRow_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentRequirementRow" ADD CONSTRAINT "AssessmentRequirementRow_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "AiSystemObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssessmentChangeLog" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentChangeLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssessmentChangeLog_assessmentId_createdAt_idx" ON "AssessmentChangeLog"("assessmentId", "createdAt");
ALTER TABLE "AssessmentChangeLog" ADD CONSTRAINT "AssessmentChangeLog_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
