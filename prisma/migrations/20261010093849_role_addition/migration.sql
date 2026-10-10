-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT';
