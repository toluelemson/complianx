-- Traceability query indexes for requirement, action, and evidence timelines.
CREATE INDEX "Obligation_packVersionId_createdAt_idx"
  ON "Obligation"("packVersionId", "createdAt");

CREATE INDEX "ComplianceAction_obligationId_status_idx"
  ON "ComplianceAction"("obligationId", "status");

CREATE INDEX "ObligationEvidence_aiSystemObligationId_createdAt_idx"
  ON "ObligationEvidence"("aiSystemObligationId", "createdAt");
