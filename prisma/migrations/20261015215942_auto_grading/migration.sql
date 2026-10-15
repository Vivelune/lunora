-- AlterTable
ALTER TABLE "AttemptAnswer" ADD COLUMN     "isCorrect" BOOLEAN,
ADD COLUMN     "pointsAwarded" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN     "explanationsReleasedAt" TIMESTAMP(3),
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "passed" BOOLEAN,
ADD COLUMN     "percentage" DECIMAL(5,2),
ADD COLUMN     "pointsEarned" DECIMAL(8,2),
ADD COLUMN     "pointsPossible" DECIMAL(8,2),
ADD COLUMN     "resultsReleasedAt" TIMESTAMP(3);
