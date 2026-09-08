CREATE TYPE "EvidenceLinkType" AS ENUM ('PRIMARY', 'SUPPORTING', 'REFERENCE');

CREATE TABLE "ObligationEvidence" (
    "id" TEXT NOT NULL,
    "aiSystemObligationId" TEXT NOT NULL,
    "artifactId" TEXT,
    "documentId" TEXT,
    "linkType" "EvidenceLinkType" NOT NULL DEFAULT 'SUPPORTING',
    "notes" TEXT,
    "linkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObligationEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObligationEvidence_aiSystemObligationId_idx" ON "ObligationEvidence"("aiSystemObligationId");
CREATE INDEX "ObligationEvidence_artifactId_idx" ON "ObligationEvidence"("artifactId");
CREATE INDEX "ObligationEvidence_documentId_idx" ON "ObligationEvidence"("documentId");

ALTER TABLE "ObligationEvidence" ADD CONSTRAINT "ObligationEvidence_aiSystemObligationId_fkey" FOREIGN KEY ("aiSystemObligationId") REFERENCES "AiSystemObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObligationEvidence" ADD CONSTRAINT "ObligationEvidence_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "SectionArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObligationEvidence" ADD CONSTRAINT "ObligationEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObligationEvidence" ADD CONSTRAINT "ObligationEvidence_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
