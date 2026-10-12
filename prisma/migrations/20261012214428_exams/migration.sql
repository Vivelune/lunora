-- CreateEnum
CREATE TYPE "ReleasePolicy" AS ENUM ('IMMEDIATE', 'AFTER_DEADLINE', 'MANUAL');

-- CreateEnum
CREATE TYPE "FocusPolicy" AS ENUM ('OFF', 'LOG_ONLY', 'WARN_THEN_FLAG', 'AUTO_SUBMIT');

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamVersion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "instructions" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingPercent" INTEGER,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "resultRelease" "ReleasePolicy" NOT NULL DEFAULT 'IMMEDIATE',
    "explanationRelease" "ReleasePolicy" NOT NULL DEFAULT 'AFTER_DEADLINE',
    "focusPolicy" "FocusPolicy" NOT NULL DEFAULT 'OFF',
    "maxFocusViolations" INTEGER NOT NULL DEFAULT 3,
    "requireFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_subjectId_status_idx" ON "Exam"("subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamVersion_examId_versionNumber_key" ON "ExamVersion"("examId", "versionNumber");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamVersion" ADD CONSTRAINT "ExamVersion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
