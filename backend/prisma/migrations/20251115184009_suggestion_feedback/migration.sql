-- CreateTable
CREATE TABLE "SuggestionFeedback" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "liked" BOOLEAN NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SuggestionFeedback" ADD CONSTRAINT "SuggestionFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionFeedback" ADD CONSTRAINT "SuggestionFeedback_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionFeedback" ADD CONSTRAINT "SuggestionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
