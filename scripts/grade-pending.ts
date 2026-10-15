import "dotenv/config";
import prisma from "../lib/prisma";
import { gradeAttemptById } from "../lib/attempt-grading";

async function main() {
  const pending = await prisma.examAttempt.findMany({
    where: { status: { in: ["SUBMITTED", "EXPIRED"] } },
    orderBy: { startedAt: "asc" },
    select: { id: true },
  });
  console.log(`Ended attempts waiting to be graded: ${pending.length}`);

  let graded = 0;
  for (const { id } of pending) {
    try {
      if (await gradeAttemptById(id)) graded += 1;
    } catch (error) {
      console.error(`Could not grade ${id}:`, error instanceof Error ? error.message : "unknown");
    }
  }
  console.log(`Graded ${graded}. Run it again: it should find none.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });