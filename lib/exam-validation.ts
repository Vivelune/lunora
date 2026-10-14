import "server-only";
import prisma from "./prisma";
import { MAX_OPTIONS, MIN_OPTIONS } from "./question-input";
import { normalizeAnswer } from "./answers";

type Db = Pick<typeof prisma, "examVersion">;

/** Returns every reason this version cannot be published. An empty list means it is ready. */
export async function getPublishProblems(versionId: string, db: Db = prisma): Promise<string[]> {
  const version = await db.examVersion.findUnique({
    where: { id: versionId },
    select: {
      durationMinutes: true,
      maxAttempts: true,
      exam: { select: { title: true } },
      questions: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          type: true,
          prompt: true,
          acceptedAnswers: true,
          options: { select: { text: true, isCorrect: true } },
        },
      },
    },
  });

  if (!version) {
    return ["The exam version was not found"];
  }

  const problems: string[] = [];

  if (version.exam.title.trim() === "") problems.push("The exam needs a title");
  if (version.durationMinutes < 1) problems.push("The duration must be at least 1 minute");
  if (version.maxAttempts < 1) problems.push("The exam must allow at least 1 attempt");
  if (version.questions.length === 0) problems.push("Add at least one question");

  version.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;

    if (question.position !== index + 1) {
      problems.push(`${label}: the question order has a gap. Reorder or delete and re-add a question to repair it`);
    }
    if (question.prompt.trim() === "") {
      problems.push(`${label}: the question text is empty`);
    }

    const correct = question.options.filter((o) => o.isCorrect).length;

    switch (question.type) {
      case "SINGLE_CHOICE":
      case "MULTIPLE_SELECT": {
        if (question.options.length < MIN_OPTIONS || question.options.length > MAX_OPTIONS) {
          problems.push(`${label}: needs between ${MIN_OPTIONS} and ${MAX_OPTIONS} options`);
        }
        if (question.options.some((o) => o.text.trim() === "")) {
          problems.push(`${label}: an option has no text`);
        }
        if (new Set(question.options.map((o) => normalizeAnswer(o.text))).size !== question.options.length) {
          problems.push(`${label}: two options have the same text`);
        }
        if (question.type === "SINGLE_CHOICE" && correct !== 1) {
          problems.push(`${label}: needs exactly one correct option`);
        }
        if (question.type === "MULTIPLE_SELECT" && correct < 1) {
          problems.push(`${label}: needs at least one correct option`);
        }
        break;
      }
      case "TRUE_FALSE": {
        if (question.options.length !== 2 || correct !== 1) {
          problems.push(`${label}: needs a True and a False option with exactly one correct`);
        }
        break;
      }
      case "SHORT_ANSWER": {
        if (question.acceptedAnswers.length === 0) {
          problems.push(`${label}: needs at least one accepted answer`);
        }
        if (question.options.length > 0) {
          problems.push(`${label}: a short-answer question should not have options`);
        }
        break;
      }
    }
  });

  return problems;
}