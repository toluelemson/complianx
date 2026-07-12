-- CreateEnum
CREATE TYPE "ArtifactPurpose" AS ENUM ('GENERIC', 'DATASET', 'MODEL');

-- AlterTable
ALTER TABLE "SectionArtifact" ADD COLUMN     "purpose" "ArtifactPurpose" NOT NULL DEFAULT 'GENERIC';

