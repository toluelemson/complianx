-- CreateEnum
CREATE TYPE "PackStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "PublicSessionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('SINGLE', 'MULTI', 'BOOLEAN', 'TEXT', 'NUMBER');

-- CreateTable
CREATE TABLE "CompliancePackVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "PackStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "questionPack" JSONB NOT NULL,
    "rulePack" JSONB NOT NULL,
    "legalRegistry" JSONB NOT NULL,
    "changelog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompliancePackVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicEuAiActSession" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "status" "PublicSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "packVersionId" TEXT NOT NULL,
    "email" TEXT,
    "locale" TEXT DEFAULT 'en',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicEuAiActSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicEuAiActAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "answerType" "AnswerType" NOT NULL,
    "valueJson" JSONB NOT NULL,
    "normalizedJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicEuAiActAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicEuAiActResult" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "packVersionId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "legalVersion" TEXT NOT NULL,
    "resultSnapshot" JSONB NOT NULL,
    "reasoningTrace" JSONB NOT NULL,
    "obligations" JSONB NOT NULL,
    "evidenceChecklist" JSONB NOT NULL,
    "nextDocuments" JSONB NOT NULL,
    "ambiguityFlags" JSONB NOT NULL,
    "reportFileUrl" TEXT,
    "shareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicEuAiActResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePackVersion_key_version_key" ON "CompliancePackVersion"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PublicEuAiActSession_sessionTokenHash_key" ON "PublicEuAiActSession"("sessionTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PublicEuAiActAnswer_sessionId_questionKey_key" ON "PublicEuAiActAnswer"("sessionId", "questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "PublicEuAiActResult_publicId_key" ON "PublicEuAiActResult"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicEuAiActResult_sessionId_key" ON "PublicEuAiActResult"("sessionId");

-- AddForeignKey
ALTER TABLE "PublicEuAiActSession" ADD CONSTRAINT "PublicEuAiActSession_packVersionId_fkey" FOREIGN KEY ("packVersionId") REFERENCES "CompliancePackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicEuAiActAnswer" ADD CONSTRAINT "PublicEuAiActAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicEuAiActSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicEuAiActResult" ADD CONSTRAINT "PublicEuAiActResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicEuAiActSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicEuAiActResult" ADD CONSTRAINT "PublicEuAiActResult_packVersionId_fkey" FOREIGN KEY ("packVersionId") REFERENCES "CompliancePackVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
