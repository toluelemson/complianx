-- CreateEnum
CREATE TYPE "ProjectWorkflowStatus" AS ENUM (
  'DRAFT',
  'READY_FOR_REVIEW',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'RESUBMITTED',
  'APPROVED',
  'ARCHIVED',
  'REJECTED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "SectionWorkflowStatus" AS ENUM (
  'DRAFT',
  'COMPLETE',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED'
);

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "workflowStatus" "ProjectWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "workflowVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Section"
ADD COLUMN "workflowStatus" "SectionWorkflowStatus" NOT NULL DEFAULT 'DRAFT';

-- Backfill project workflow state from the legacy status column.
UPDATE "Project"
SET "workflowStatus" = CASE "status"
  WHEN 'IN_REVIEW' THEN 'IN_REVIEW'::"ProjectWorkflowStatus"
  WHEN 'CHANGES_REQUESTED' THEN 'CHANGES_REQUESTED'::"ProjectWorkflowStatus"
  WHEN 'APPROVED' THEN 'APPROVED'::"ProjectWorkflowStatus"
  ELSE 'DRAFT'::"ProjectWorkflowStatus"
END;

-- Backfill section workflow state from the legacy status column.
UPDATE "Section"
SET "workflowStatus" = CASE "status"
  WHEN 'IN_REVIEW' THEN 'IN_REVIEW'::"SectionWorkflowStatus"
  WHEN 'CHANGES_REQUESTED' THEN 'CHANGES_REQUESTED'::"SectionWorkflowStatus"
  WHEN 'APPROVED' THEN 'APPROVED'::"SectionWorkflowStatus"
  ELSE 'DRAFT'::"SectionWorkflowStatus"
END;
