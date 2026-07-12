-- Add verification & reset columns to User so IAM flows can rely on them.
ALTER TABLE "User"
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
