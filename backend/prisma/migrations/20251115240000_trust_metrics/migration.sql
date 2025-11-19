-- CreateTable
CREATE TABLE "TrustMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "datasetName" TEXT,
    "modelName" TEXT,
    "targetMin" DOUBLE PRECISION,
    "targetMax" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "sectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustSample" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifactId" TEXT,

    CONSTRAINT "TrustSample_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrustMetric" ADD CONSTRAINT "TrustMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustMetric" ADD CONSTRAINT "TrustMetric_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustSample" ADD CONSTRAINT "TrustSample_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "TrustMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustSample" ADD CONSTRAINT "TrustSample_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "SectionArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

