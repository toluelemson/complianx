CREATE TYPE "ReportStatus" AS ENUM ('GENERATED', 'ARCHIVED');

CREATE TABLE "ReadinessReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "packVersionId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATED',
    "score" INTEGER NOT NULL,
    "readinessStatus" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadinessReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadinessReport_projectId_createdAt_idx" ON "ReadinessReport"("projectId", "createdAt");
ALTER TABLE "ReadinessReport" ADD CONSTRAINT "ReadinessReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReadinessReport" ADD CONSTRAINT "ReadinessReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReadinessReport" ADD CONSTRAINT "ReadinessReport_packVersionId_fkey" FOREIGN KEY ("packVersionId") REFERENCES "CompliancePackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
