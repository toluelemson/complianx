-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'REVIEWER', 'ADMIN');

-- AlterTable
ALTER TABLE "ProjectStatusEvent" ADD COLUMN     "signature" TEXT;

-- AlterTable
ALTER TABLE "SectionStatusEvent" ADD COLUMN     "signature" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
