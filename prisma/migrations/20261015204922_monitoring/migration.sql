-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN     "focusLostAt" TIMESTAMP(3),
ADD COLUMN     "lastViolationAt" TIMESTAMP(3);
