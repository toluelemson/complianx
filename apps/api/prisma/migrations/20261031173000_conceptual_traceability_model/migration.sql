-- Extend assessments with assessor identity and a persisted coverage snapshot.
CREATE TYPE "AssessorType" AS ENUM ('SELF_ASSESSMENT', 'INTERNAL_AUDIT', 'NOTIFIED_BODY', 'COMPETENT_AUTHORITY');
CREATE TYPE "SystemAssetType" AS ENUM ('MODEL', 'DATASET', 'SOFTWARE_COMPONENT', 'INFRASTRUCTURE', 'USER_INTERFACE', 'HUMAN_PROCESS', 'OTHER');
CREATE TYPE "TechnicalMeasureStatus" AS ENUM ('PLANNED', 'PARTIAL', 'COMPLETE');
CREATE TYPE "DocumentationItemType" AS ENUM ('GENERAL_SYSTEM_DESCRIPTION', 'DETAILED_SYSTEM_ELEMENTS', 'DESIGN_AND_DEVELOPMENT_PROCEDURES', 'RISK_MANAGEMENT_DOCUMENTATION', 'DATA_GOVERNANCE_DOCUMENTATION', 'MONITORING_AND_TESTING', 'CHANGES_AND_UPDATES', 'STANDARDS_APPLIED', 'EU_DECLARATION_OF_CONFORMITY', 'INSTRUCTIONS_FOR_USE', 'OTHER');

ALTER TABLE "Assessment"
  ADD COLUMN "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "assessorType" "AssessorType" NOT NULL DEFAULT 'SELF_ASSESSMENT',
  ADD COLUMN "assessorName" TEXT,
  ADD COLUMN "coverageScore" DOUBLE PRECISION;

CREATE TABLE "SystemAsset" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "assetType" "SystemAssetType" NOT NULL,
  "lifecycleStage" "LifecycleStage",
  "version" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequirementAsset" (
  "aiSystemObligationId" TEXT NOT NULL,
  "systemAssetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequirementAsset_pkey" PRIMARY KEY ("aiSystemObligationId", "systemAssetId")
);

CREATE TABLE "TechnicalMeasure" (
  "id" TEXT NOT NULL,
  "aiSystemObligationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TechnicalMeasureStatus" NOT NULL DEFAULT 'PLANNED',
  "verificationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechnicalMeasure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentationItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "systemAssetId" TEXT,
  "aiSystemObligationId" TEXT,
  "documentType" "DocumentationItemType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "referenceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentationItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemAsset_projectId_name_key" ON "SystemAsset"("projectId", "name");
CREATE INDEX "SystemAsset_projectId_assetType_idx" ON "SystemAsset"("projectId", "assetType");
CREATE INDEX "RequirementAsset_systemAssetId_idx" ON "RequirementAsset"("systemAssetId");
CREATE INDEX "TechnicalMeasure_aiSystemObligationId_status_idx" ON "TechnicalMeasure"("aiSystemObligationId", "status");
CREATE INDEX "DocumentationItem_projectId_documentType_idx" ON "DocumentationItem"("projectId", "documentType");
CREATE INDEX "DocumentationItem_systemAssetId_idx" ON "DocumentationItem"("systemAssetId");
CREATE INDEX "DocumentationItem_aiSystemObligationId_idx" ON "DocumentationItem"("aiSystemObligationId");

ALTER TABLE "SystemAsset" ADD CONSTRAINT "SystemAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementAsset" ADD CONSTRAINT "RequirementAsset_aiSystemObligationId_fkey" FOREIGN KEY ("aiSystemObligationId") REFERENCES "AiSystemObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementAsset" ADD CONSTRAINT "RequirementAsset_systemAssetId_fkey" FOREIGN KEY ("systemAssetId") REFERENCES "SystemAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechnicalMeasure" ADD CONSTRAINT "TechnicalMeasure_aiSystemObligationId_fkey" FOREIGN KEY ("aiSystemObligationId") REFERENCES "AiSystemObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentationItem" ADD CONSTRAINT "DocumentationItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentationItem" ADD CONSTRAINT "DocumentationItem_systemAssetId_fkey" FOREIGN KEY ("systemAssetId") REFERENCES "SystemAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentationItem" ADD CONSTRAINT "DocumentationItem_aiSystemObligationId_fkey" FOREIGN KEY ("aiSystemObligationId") REFERENCES "AiSystemObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
