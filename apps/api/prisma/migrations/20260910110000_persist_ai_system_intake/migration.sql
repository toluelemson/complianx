ALTER TABLE "Project"
  ADD COLUMN "businessPurpose" TEXT,
  ADD COLUMN "intendedUsers" TEXT,
  ADD COLUMN "affectedPersons" TEXT,
  ADD COLUMN "lifecycleStage" TEXT,
  ADD COLUMN "responsibleOwner" TEXT,
  ADD COLUMN "providerOrDeveloper" TEXT,
  ADD COLUMN "deployerOrUser" TEXT,
  ADD COLUMN "importer" TEXT,
  ADD COLUMN "distributor" TEXT,
  ADD COLUMN "authorizedRepresentative" TEXT,
  ADD COLUMN "generatesContent" BOOLEAN,
  ADD COLUMN "useCaseIndicators" JSONB;

CREATE TYPE "LifecycleStage" AS ENUM ('UNKNOWN', 'DESIGN', 'DEVELOPMENT', 'PILOT', 'PRODUCTION', 'RETIRED');
ALTER TABLE "Project" ALTER COLUMN "lifecycleStage" TYPE "LifecycleStage" USING "lifecycleStage"::"LifecycleStage";
