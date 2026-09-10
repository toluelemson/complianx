ALTER TABLE "Document"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "frameworkKey" TEXT NOT NULL DEFAULT 'eu-ai-act',
  ADD COLUMN "regulatoryContentVersion" TEXT,
  ADD COLUMN "approvalState" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "lifecycleStatus" TEXT NOT NULL DEFAULT 'CURRENT',
  ADD COLUMN "provenanceStatus" TEXT NOT NULL DEFAULT 'PARTIAL';

CREATE TYPE "DocumentApprovalState" AS ENUM ('DRAFT', 'APPROVED');
CREATE TYPE "DocumentLifecycleStatus" AS ENUM ('CURRENT', 'SUPERSEDED', 'FAILED');
CREATE TYPE "DocumentProvenanceStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'UNVERIFIED');

ALTER TABLE "Document" ALTER COLUMN "approvalState" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "approvalState" TYPE "DocumentApprovalState" USING "approvalState"::"DocumentApprovalState";
ALTER TABLE "Document" ALTER COLUMN "approvalState" SET DEFAULT 'DRAFT'::"DocumentApprovalState";
ALTER TABLE "Document" ALTER COLUMN "lifecycleStatus" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "lifecycleStatus" TYPE "DocumentLifecycleStatus" USING "lifecycleStatus"::"DocumentLifecycleStatus";
ALTER TABLE "Document" ALTER COLUMN "lifecycleStatus" SET DEFAULT 'CURRENT'::"DocumentLifecycleStatus";
ALTER TABLE "Document" ALTER COLUMN "provenanceStatus" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "provenanceStatus" TYPE "DocumentProvenanceStatus" USING "provenanceStatus"::"DocumentProvenanceStatus";
ALTER TABLE "Document" ALTER COLUMN "provenanceStatus" SET DEFAULT 'PARTIAL'::"DocumentProvenanceStatus";
