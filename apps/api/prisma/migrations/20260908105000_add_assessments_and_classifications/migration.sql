CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'CLASSIFIED', 'ARCHIVED');

CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "packVersionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassificationResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "resultSnapshot" JSONB NOT NULL,
    "reasoningTrace" JSONB NOT NULL,
    "legalReferences" JSONB NOT NULL,
    "ambiguityFlags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassificationResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assessment_projectId_createdAt_idx" ON "Assessment"("projectId", "createdAt");
CREATE INDEX "ClassificationResult_assessmentId_createdAt_idx" ON "ClassificationResult"("assessmentId", "createdAt");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_packVersionId_fkey" FOREIGN KEY ("packVersionId") REFERENCES "CompliancePackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassificationResult" ADD CONSTRAINT "ClassificationResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
