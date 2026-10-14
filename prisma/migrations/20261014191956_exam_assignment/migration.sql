-- CreateEnum
CREATE TYPE "ExamVisibility" AS ENUM ('ASSIGNED_ONLY', 'OPEN_PRACTICE');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "visibility" "ExamVisibility" NOT NULL DEFAULT 'ASSIGNED_ONLY';

-- CreateTable
CREATE TABLE "ExamAssignment" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableFrom" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "maxAttemptsOverride" INTEGER,
    "instructions" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamAssignment_examId_idx" ON "ExamAssignment"("examId");

-- CreateIndex
CREATE INDEX "ExamAssignment_studentId_status_idx" ON "ExamAssignment"("studentId", "status");

-- CreateIndex
CREATE INDEX "ExamAssignment_groupId_idx" ON "ExamAssignment"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAssignment_studentId_examId_key" ON "ExamAssignment"("studentId", "examId");

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExamVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudentGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
