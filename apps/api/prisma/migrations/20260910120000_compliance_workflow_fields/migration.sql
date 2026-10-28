ALTER TABLE "Company"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "contactEmail" TEXT;

ALTER TYPE "ProjectWorkflowStatus" ADD VALUE IF NOT EXISTS 'INFORMATION_REQUIRED';
ALTER TYPE "ProjectWorkflowStatus" ADD VALUE IF NOT EXISTS 'COLLECTING_EVIDENCE';
ALTER TYPE "ProjectWorkflowStatus" ADD VALUE IF NOT EXISTS 'MONITORING';

ALTER TABLE "SectionArtifact"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "externalUrl" TEXT,
  ADD COLUMN "provenanceNote" TEXT;

ALTER TABLE "SectionComment"
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedById" TEXT,
  ADD COLUMN "linkedEntityType" TEXT,
  ADD COLUMN "linkedEntityId" TEXT,
  ADD COLUMN "mentions" JSONB;

ALTER TABLE "SectionComment"
  ADD CONSTRAINT "SectionComment_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "ObligationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ObligationApprovalState" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'CHANGES_REQUESTED');
ALTER TABLE "AiSystemObligation"
  ADD COLUMN "priority" "ObligationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "approvalState" "ObligationApprovalState" NOT NULL DEFAULT 'DRAFT';

CREATE TABLE "AssessmentAnswer" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "questionKey" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "answeredById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentAnswer_assessmentId_questionKey_key" ON "AssessmentAnswer"("assessmentId", "questionKey");
CREATE INDEX "AssessmentAnswer_assessmentId_updatedAt_idx" ON "AssessmentAnswer"("assessmentId", "updatedAt");
ALTER TABLE "AssessmentAnswer"
  ADD CONSTRAINT "AssessmentAnswer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssessmentAnswer_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
