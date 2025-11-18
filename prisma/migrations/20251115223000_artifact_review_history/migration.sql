-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "SectionArtifact" ADD COLUMN     "checksum" TEXT NOT NULL,
ADD COLUMN     "citationKey" TEXT NOT NULL,
ADD COLUMN     "previousArtifactId" TEXT,
ADD COLUMN     "reviewComment" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "ArtifactStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "SectionArtifact_sectionId_version_key" ON "SectionArtifact"("sectionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SectionArtifact_citationKey_key" ON "SectionArtifact"("citationKey");

-- AddForeignKey
ALTER TABLE "SectionArtifact" ADD CONSTRAINT "SectionArtifact_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionArtifact" ADD CONSTRAINT "SectionArtifact_previousArtifactId_fkey" FOREIGN KEY ("previousArtifactId") REFERENCES "SectionArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

