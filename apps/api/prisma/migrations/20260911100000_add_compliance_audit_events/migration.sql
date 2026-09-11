CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "projectId" TEXT,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "metadata" JSONB,
    "correlationId" TEXT,
    "packVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_companyId_createdAt_idx" ON "AuditEvent"("companyId", "createdAt");
CREATE INDEX "AuditEvent_projectId_createdAt_idx" ON "AuditEvent"("projectId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompliancePackVersion"
  ADD COLUMN "legalInstrument" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "effectiveAt" TIMESTAMP(3),
  ADD COLUMN "retrievedAt" TIMESTAMP(3),
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "schemaVersion" TEXT,
  ADD COLUMN "ruleSetVersion" TEXT,
  ADD COLUMN "questionnaireVersion" TEXT,
  ADD COLUMN "supersededById" TEXT;

ALTER TABLE "SectionArtifact" ADD COLUMN "validFrom" TIMESTAMP(3);

ALTER TABLE "ClassificationResult"
  ADD COLUMN "questionnaireVersion" TEXT,
  ADD COLUMN "evaluatedById" TEXT,
  ADD COLUMN "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ComplianceAction"
  ADD COLUMN "findingId" TEXT,
  ADD COLUMN "priority" "ObligationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "closureEvidenceId" TEXT,
  ADD COLUMN "closureNotes" TEXT,
  ADD COLUMN "closedAt" TIMESTAMP(3);

ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_REVIEW';
ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ActionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "FindingSource" AS ENUM ('ASSESSMENT', 'EVIDENCE_REVIEW', 'MONITORING', 'MANUAL_REVIEW');
CREATE TYPE "FindingSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'READY_FOR_REVIEW', 'RESOLVED', 'ACCEPTED_RISK', 'REOPENED');

CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "obligationId" TEXT,
    "source" "FindingSource" NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT,
    "evidenceBasis" JSONB,
    "resolutionSummary" TEXT,
    "reviewerDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Finding_projectId_status_idx" ON "Finding"("projectId", "status");
CREATE INDEX "Finding_obligationId_idx" ON "Finding"("obligationId");

CREATE TABLE "CompliancePackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "packVersionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "manifest" JSONB NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompliancePackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompliancePackage_projectId_version_key" ON "CompliancePackage"("projectId", "version");
CREATE INDEX "CompliancePackage_projectId_createdAt_idx" ON "CompliancePackage"("projectId", "createdAt");

ALTER TABLE "Finding" ADD CONSTRAINT "Finding_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_obligationId_fkey"
  FOREIGN KEY ("obligationId") REFERENCES "AiSystemObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceAction" ADD CONSTRAINT "ComplianceAction_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompliancePackage" ADD CONSTRAINT "CompliancePackage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompliancePackage" ADD CONSTRAINT "CompliancePackage_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompliancePackage" ADD CONSTRAINT "CompliancePackage_generatedById_fkey"
  FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompliancePackage" ADD CONSTRAINT "CompliancePackage_packVersionId_fkey"
  FOREIGN KEY ("packVersionId") REFERENCES "CompliancePackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassificationResult" ADD CONSTRAINT "ClassificationResult_evaluatedById_fkey"
  FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompliancePackVersion" ADD CONSTRAINT "CompliancePackVersion_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "CompliancePackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
