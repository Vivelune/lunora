import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import prisma from "../lib/prisma";
import { STUDENT_QUESTION_SELECT, assertNoAnswerKey, toStudentQuestion } from "../lib/exam-student-safe";

const failures: string[] = [];
const pass = (message: string) => console.log(`PASS  ${message}`);
const fail = (message: string) => {
  failures.push(message);
  console.log(`FAIL  ${message}`);
};

function walk(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

async function main() {
  // 1. The guard itself works.
  try {
    assertNoAnswerKey({ options: [{ text: "x", isCorrect: true }] });
    fail("The guard did not catch isCorrect");
  } catch {
    pass("The guard rejects data containing isCorrect");
  }
  try {
    assertNoAnswerKey({ q: { acceptedAnswers: ["7"] } });
    fail("The guard did not catch acceptedAnswers");
  } catch {
    pass("The guard rejects data containing acceptedAnswers");
  }
  try {
    assertNoAnswerKey({ explanation: "because" });
    fail("The guard did not catch explanation");
  } catch {
    pass("The guard rejects data containing explanation");
  }

  // 2. The real student-safe read, against real data.
  const version = await prisma.examVersion.findFirst({
    where: { publishedAt: { not: null }, questions: { some: {} } },
    orderBy: { createdAt: "desc" },
    select: { id: true, exam: { select: { title: true } }, _count: { select: { questions: true } } },
  });

  if (!version) {
    console.log("SKIP  No published exam with questions found. Publish one and run again.");
  } else {
    const rows = await prisma.question.findMany({
      where: { versionId: version.id },
      orderBy: { position: "asc" },
      select: STUDENT_QUESTION_SELECT,
    });
    const students = rows.map(toStudentQuestion);
    const allowedQuestionKeys = new Set(["id", "position", "type", "prompt", "points", "imageId", "imageAlt", "options"]);
    const allowedOptionKeys = new Set(["id", "position", "text"]);

    if (students.length === version._count.questions) {
      pass(`Read ${students.length} questions from "${version.exam.title}" through the safe select`);
    } else {
      fail("The safe read returned a different number of questions");
    }

    const extraQuestionKeys = students.flatMap((q) => Object.keys(q).filter((k) => !allowedQuestionKeys.has(k)));
    const extraOptionKeys = students.flatMap((q) =>
      q.options.flatMap((o) => Object.keys(o).filter((k) => !allowedOptionKeys.has(k)))
    );
    if (extraQuestionKeys.length === 0 && extraOptionKeys.length === 0) {
      pass("Questions and options contain only allowed fields");
    } else {
      fail(`Unexpected fields: ${[...extraQuestionKeys, ...extraOptionKeys].join(", ")}`);
    }

    const json = JSON.stringify(students);
    if (/isCorrect|acceptedAnswers|explanation/.test(json)) {
      fail("Serialized student data contains an answer-key field name");
    } else {
      pass("Serialized student data contains no answer-key field names");
    }
  }

  // 3. Student-facing code never touches the answer key directly.
  const SCAN_DIRS = ["app/(student)", "app/api/exam-images", "app/api/resources", "app/api/attempts", "components"];
  const FORBIDDEN = ["isCorrect", "acceptedAnswers", "prisma.answerOption", "prisma.question"];

  const offenders: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
      const source = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        if (source.includes(token)) offenders.push(`${file} uses "${token}"`);
      }
    }
  }
  if (offenders.length === 0) {
    pass(`No student-facing code references the answer key (scanned ${SCAN_DIRS.length} folders)`);
  } else {
    offenders.forEach((o) => fail(o));
  }

  console.log(failures.length === 0 ? "\nAll safety checks passed." : `\n${failures.length} check(s) failed.`);
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Script error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });