import "server-only";
import { z } from "zod";
import prisma from "./prisma";
import { TARGET_TYPES, parseDay } from "./assignments";

const FIELD_KEYS = [
  "examId",
  "targetType",
  "studentId",
  "groupId",
  "availableFrom",
  "dueDate",
  "attemptsOverride",
  "instructions",
] as const;

const inputSchema = z.object({
  examId: z.string().min(1, "Choose an exam"),
  targetType: z.enum(TARGET_TYPES, { message: "Choose who to assign to" }),
  studentId: z.string(),
  groupId: z.string(),
  availableFrom: z.string(),
  dueDate: z.string(),
  attemptsOverride: z.string(),
  instructions: z.string().trim().max(1000, "Instructions are too long (1000 characters maximum)"),
});

export type ExamAssignmentInput = z.infer<typeof inputSchema>;

export function readExamInput(get: (key: string) => string) {
  return inputSchema.safeParse({
    examId: get("examId"),
    targetType: get("targetType"),
    studentId: get("studentId"),
    groupId: get("groupId"),
    availableFrom: get("availableFrom"),
    dueDate: get("dueDate"),
    attemptsOverride: get("attemptsOverride"),
    instructions: get("instructions"),
  });
}

/** Turns the form fields into URL parameters, so nothing typed is lost. */
export function examFormParams(get: (key: string) => string): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FIELD_KEYS) {
    const value = get(key);
    if (value !== "") params.set(key, value);
  }
  return params;
}

export function parseAttemptsOverride(value: string): { ok: true; value: number | null } | { ok: false } {
  const text = value.trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d+$/.test(text)) return { ok: false };
  const n = Number(text);
  return n >= 1 && n <= 20 ? { ok: true, value: n } : { ok: false };
}

export type Person = { id: string; firstName: string | null; lastName: string | null };

export type ResolvedExamAssignment =
  | { ok: false; message: string }
  | {
      ok: true;
      examId: string;
      examTitle: string;
      versionId: string;
      versionNumber: number;
      examMaxAttempts: number;
      targetLabel: string;
      groupId: string | null;
      availableFrom: Date | null;
      dueDate: Date | null;
      attemptsOverride: number | null;
      allTargets: number;
      newStudents: Person[];
      skippedCount: number;
    };

const byName = (a: Person, b: Person) =>
  (a.lastName ?? "").localeCompare(b.lastName ?? "") ||
  (a.firstName ?? "").localeCompare(b.firstName ?? "");

/** Works out exactly who would be assigned. Used for the preview AND again when confirming. */
export async function resolveExamAssignment(input: ExamAssignmentInput): Promise<ResolvedExamAssignment> {
  const exam = await prisma.exam.findFirst({
    where: { id: input.examId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      availableFrom: true,
      availableUntil: true,
      versions: {
        where: { publishedAt: { not: null } },
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { id: true, versionNumber: true, maxAttempts: true },
      },
    },
  });
  const version = exam?.versions[0];
  if (!exam || !version) {
    return { ok: false, message: "Choose a published, live exam" };
  }

  const from = parseDay(input.availableFrom, false);
  const due = parseDay(input.dueDate, true);
  if (!from.ok) return { ok: false, message: "The available-from date is not valid" };
  if (!due.ok) return { ok: false, message: "The due date is not valid" };

  const attempts = parseAttemptsOverride(input.attemptsOverride);
  if (!attempts.ok) return { ok: false, message: "The attempt limit must be a whole number from 1 to 20" };

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (exam.availableUntil && exam.availableUntil.getTime() < now.getTime()) {
    return { ok: false, message: "This exam's availability window has ended" };
  }
  if (due.date && due.date.getTime() < today) {
    return { ok: false, message: "The due date cannot be in the past" };
  }
  if (from.date && due.date && due.date.getTime() < from.date.getTime()) {
    return { ok: false, message: "The due date cannot be before the available-from date" };
  }
  if (due.date && exam.availableUntil && due.date.getTime() > exam.availableUntil.getTime()) {
    return { ok: false, message: "The due date is after this exam's availability window ends" };
  }

  let targets: Person[] = [];
  let targetLabel = "";
  let groupId: string | null = null;

  if (input.targetType === "student") {
    const student = await prisma.studentProfile.findFirst({
      where: { id: input.studentId, role: "STUDENT", onboardingCompletedAt: { not: null } },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) return { ok: false, message: "Choose a valid student" };
    targets = [student];
    targetLabel = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim();
  } else if (input.targetType === "group") {
    const group = await prisma.studentGroup.findUnique({
      where: { id: input.groupId },
      select: {
        id: true,
        name: true,
        isActive: true,
        memberships: {
          select: {
            student: {
              select: { id: true, firstName: true, lastName: true, role: true, onboardingCompletedAt: true },
            },
          },
        },
      },
    });
    if (!group) return { ok: false, message: "Choose a valid group" };
    if (!group.isActive) return { ok: false, message: "That group is archived" };
    targets = group.memberships
      .map((m) => m.student)
      .filter((s) => s.role === "STUDENT" && s.onboardingCompletedAt !== null)
      .map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }));
    if (targets.length === 0) return { ok: false, message: "That group has no eligible students" };
    groupId = group.id;
    targetLabel = `Group: ${group.name}`;
  } else {
    targets = await prisma.studentProfile.findMany({
      where: { role: "STUDENT", onboardingCompletedAt: { not: null } },
      select: { id: true, firstName: true, lastName: true },
    });
    if (targets.length === 0) return { ok: false, message: "There are no eligible students" };
    targetLabel = "All eligible students";
  }

  targets.sort(byName);

  const existing = await prisma.examAssignment.findMany({
    where: { examId: exam.id, studentId: { in: targets.map((t) => t.id) } },
    select: { studentId: true },
  });
  const alreadyAssigned = new Set(existing.map((e) => e.studentId));
  const newStudents = targets.filter((t) => !alreadyAssigned.has(t.id));

  return {
    ok: true,
    examId: exam.id,
    examTitle: exam.title,
    versionId: version.id,
    versionNumber: version.versionNumber,
    examMaxAttempts: version.maxAttempts,
    targetLabel,
    groupId,
    availableFrom: from.date,
    dueDate: due.date,
    attemptsOverride: attempts.value,
    allTargets: targets.length,
    newStudents,
    skippedCount: targets.length - newStudents.length,
  };
}