ALTER TABLE "Project"
ADD COLUMN "description" TEXT,
ADD COLUMN "intendedUse" TEXT,
ADD COLUMN "deploymentGeography" TEXT,
ADD COLUMN "operatorRoles" JSONB,
ADD COLUMN "sourcePublicResultId" TEXT;
