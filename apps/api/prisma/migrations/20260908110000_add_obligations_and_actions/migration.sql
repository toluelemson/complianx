CREATE TYPE "ObligationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY', 'UNDER_REVIEW', 'COMPLETE', 'NOT_APPLICABLE');
CREATE TYPE "ActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL,
    "packVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "legalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiSystemObligation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "classificationResultId" TEXT,
    "applicabilityReason" TEXT,
    "status" "ObligationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiSystemObligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceAction" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ActionStatus" NOT NULL DEFAULT 'TODO',
    "ownerId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Obligation_packVersionId_key_key" ON "Obligation"("packVersionId", "key");
CREATE UNIQUE INDEX "AiSystemObligation_projectId_obligationId_key" ON "AiSystemObligation"("projectId", "obligationId");
CREATE INDEX "AiSystemObligation_projectId_status_idx" ON "AiSystemObligation"("projectId", "status");

ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_packVersionId_fkey" FOREIGN KEY ("packVersionId") REFERENCES "CompliancePackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSystemObligation" ADD CONSTRAINT "AiSystemObligation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSystemObligation" ADD CONSTRAINT "AiSystemObligation_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSystemObligation" ADD CONSTRAINT "AiSystemObligation_classificationResultId_fkey" FOREIGN KEY ("classificationResultId") REFERENCES "ClassificationResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiSystemObligation" ADD CONSTRAINT "AiSystemObligation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceAction" ADD CONSTRAINT "ComplianceAction_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "AiSystemObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceAction" ADD CONSTRAINT "ComplianceAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
