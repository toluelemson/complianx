CREATE TABLE "RequirementCatalogueItem" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "aiActArticle" TEXT NOT NULL,
  "trustworthinessPrinciple" "TrustworthinessPrinciple" NOT NULL,
  "architectureElements" JSONB NOT NULL,
  "verificationMethod" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequirementCatalogueItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "RequirementCatalogueItem" (
  "id",
  "text",
  "aiActArticle",
  "trustworthinessPrinciple",
  "architectureElements",
  "verificationMethod"
)
SELECT
  "catalogueId",
  "title",
  COALESCE("aiActArticle", "legalReference", 'EU AI Act'),
  "trustworthinessPrinciple",
  COALESCE("architectureElements", '[]'::jsonb),
  COALESCE("verificationMethod", 'Documented human review')
FROM "Obligation";

DROP INDEX "Obligation_catalogueId_key";
CREATE UNIQUE INDEX "Obligation_packVersionId_catalogueId_key"
  ON "Obligation"("packVersionId", "catalogueId");

ALTER TABLE "Obligation"
  ADD CONSTRAINT "Obligation_catalogueId_fkey"
  FOREIGN KEY ("catalogueId")
  REFERENCES "RequirementCatalogueItem"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
