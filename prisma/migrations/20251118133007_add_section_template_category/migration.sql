-- AlterTable
ALTER TABLE "SectionTemplate" ADD COLUMN     "category" TEXT,
ADD COLUMN     "shared" BOOLEAN NOT NULL DEFAULT false;
