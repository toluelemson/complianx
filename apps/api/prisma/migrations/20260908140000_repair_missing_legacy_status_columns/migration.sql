-- Repair databases whose migration history includes workflow_statuses but whose
-- legacy status columns were not present in the actual tables.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus') THEN
    CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SectionStatus') THEN
    CREATE TYPE "SectionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');
  END IF;
END $$;

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "Section"
ADD COLUMN IF NOT EXISTS "status" "SectionStatus" NOT NULL DEFAULT 'DRAFT';
