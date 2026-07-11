-- CreateTable
CREATE TABLE "SectionAutosave" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "SectionAutosave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionAutosave_sectionId_key" ON "SectionAutosave"("sectionId");

-- AddForeignKey
ALTER TABLE "SectionAutosave" ADD CONSTRAINT "SectionAutosave_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
