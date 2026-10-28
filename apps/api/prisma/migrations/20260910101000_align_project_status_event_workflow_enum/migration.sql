-- Keep project workflow history aligned with the project workflow state.
ALTER TABLE "ProjectStatusEvent"
ALTER COLUMN "status" TYPE "ProjectWorkflowStatus"
USING "status"::text::"ProjectWorkflowStatus";
