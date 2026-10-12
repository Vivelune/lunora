-- CreateTable
CREATE TABLE "LessonPlanItemProgress" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonPlanItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlanItemProgress_itemId_idx" ON "LessonPlanItemProgress"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlanItemProgress_assignmentId_itemId_key" ON "LessonPlanItemProgress"("assignmentId", "itemId");

-- AddForeignKey
ALTER TABLE "LessonPlanItemProgress" ADD CONSTRAINT "LessonPlanItemProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LessonPlanAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanItemProgress" ADD CONSTRAINT "LessonPlanItemProgress_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LessonPlanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
