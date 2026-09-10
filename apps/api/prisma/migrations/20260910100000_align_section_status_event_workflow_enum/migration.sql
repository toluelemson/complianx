-- Keep section workflow history aligned with the section workflow state.
ALTER TABLE "SectionStatusEvent"
ALTER COLUMN "status" TYPE "SectionWorkflowStatus"
USING "status"::text::"SectionWorkflowStatus";
