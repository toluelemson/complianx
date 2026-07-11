-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "status" "SectionStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "ProjectStatusEvent" (
    "id" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ProjectStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionStatusEvent" (
    "id" TEXT NOT NULL,
    "status" "SectionStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sectionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "SectionStatusEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectStatusEvent" ADD CONSTRAINT "ProjectStatusEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStatusEvent" ADD CONSTRAINT "ProjectStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionStatusEvent" ADD CONSTRAINT "SectionStatusEvent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionStatusEvent" ADD CONSTRAINT "SectionStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
