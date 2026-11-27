-- Complete the conceptual traceability model with explicit actors, lifecycle
-- history, assessment finalization, and database-level value/cardinality rules.
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'FINALIZED' AFTER 'CLASSIFIED';

CREATE TYPE "ComplianceStakeholderRole" AS ENUM (
  'PROVIDER',
  'DEPLOYER',
  'IMPORTER',
  'DISTRIBUTOR',
  'AUTHORIZED_REPRESENTATIVE',
  'NOTIFIED_BODY',
  'COMPETENT_AUTHORITY',
  'EU_AI_OFFICE'
);

CREATE TABLE "SystemLifecycleEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "stage" "LifecycleStage" NOT NULL,
  "happenedAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceStakeholder" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "role" "ComplianceStakeholderRole" NOT NULL,
  "name" TEXT NOT NULL,
  "registrationNumber" TEXT,
  "country" TEXT,
  "contactEmail" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceStakeholder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemLifecycleEvent_projectId_happenedAt_idx"
  ON "SystemLifecycleEvent"("projectId", "happenedAt");
CREATE UNIQUE INDEX "ComplianceStakeholder_projectId_role_name_key"
  ON "ComplianceStakeholder"("projectId", "role", "name");
CREATE INDEX "ComplianceStakeholder_projectId_role_idx"
  ON "ComplianceStakeholder"("projectId", "role");

ALTER TABLE "SystemLifecycleEvent"
  ADD CONSTRAINT "SystemLifecycleEvent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemLifecycleEvent"
  ADD CONSTRAINT "SystemLifecycleEvent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceStakeholder"
  ADD CONSTRAINT "ComplianceStakeholder_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceStakeholder"
  ADD CONSTRAINT "ComplianceStakeholder_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- New and updated records must participate in the traceability chain. The
-- constraint is NOT VALID so pre-existing legacy records remain readable.
ALTER TABLE "DocumentationItem"
  ADD CONSTRAINT "DocumentationItem_traceability_link_check"
  CHECK ("systemAssetId" IS NOT NULL OR "aiSystemObligationId" IS NOT NULL)
  NOT VALID;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_coverageScore_range_check"
  CHECK ("coverageScore" IS NULL OR ("coverageScore" >= 0 AND "coverageScore" <= 100))
  NOT VALID;

ALTER TABLE "AssessmentRequirementRow"
  ADD CONSTRAINT "AssessmentRequirementRow_score_range_check"
  CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100))
  NOT VALID;

ALTER TABLE "AssessmentRequirementRow"
  ADD CONSTRAINT "AssessmentRequirementRow_positive_weight_check"
  CHECK ("weight" > 0)
  NOT VALID;

ALTER TABLE "ComplianceStakeholder"
  ADD CONSTRAINT "ComplianceStakeholder_country_code_check"
  CHECK ("country" IS NULL OR "country" ~ '^[A-Z]{2}$');
