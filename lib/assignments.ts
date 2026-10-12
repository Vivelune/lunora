import "server-only";
import { z } from "zod";
import prisma from "./prisma";

export const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
export const TARGET_TYPES = ["student", "group", "all"] as const;

const FIELD_KEYS = [
  "planId",
  "targetType",
  "studentId",
  "groupId",
  "startDate",
  "dueDate",
  "priority",
  "instructions",
] as const;

const inputSchema = z.object({
  planId: z.string().min(1, "Choose a plan"),
  targetType: z.enum(TARGET_TYPES, { message: "Choose who to assign to" }),
  studentId: z.string(),
  groupId: z.string(),
  startDate: z.string(),
  dueDate: z.string(),
  priority: z.enum(PRIORITIES, { message: "Choose a priority" }),
  instructions: z.string().trim().max(1000, "Instructions are too long (1000 characters maximum)"),
});

export type AssignmentInput = z.infer<typeof inputSchema>;

export function readInput(get: (key: string) => string) {
  return inputSchema.safeParse({
    planId: get("planId"),
    targetType: get("targetType"),
    studentId: get("studentId"),
    groupId: get("groupId"),
    startDate: get("startDate"),
    dueDate: get("dueDate"),
    priority: get("priority"),
    instructions: get("instructions"),
  });
}

/** Turns the form fields into URL parameters, so nothing typed is lost. */
export function formParams(get: (key: string) => string): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FIELD_KEYS) {
    const value = get(key);
    if (value !== "") params.set(key, value);
  }
  return params;
}

function parseDay(
  value: string,
  endOfDay: boolean
): { ok: true; date: Date | null } | { ok: false } {
  if (value === "") return { ok: true, date: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false };
  const [y, m, d] = value.split("-").map(Number);
  const date = endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== m - 1) return { ok: false };
  return { ok: true, date };
}

export type Person = { id: string; firstName: string | null; lastName: string | null };

export type ResolvedAssignment =
  | { ok: false; message: string }
  | {
      ok: true;
      planId: string;
      planTitle: string;
      versionId: string;
      versionNumber: number;
      targetLabel: string;
      groupId: string | null;
      startDate: Date | null;
      dueDate: Date | null;
      allTargets: number;
      newStudents: Person[];
      skippedCount: number;
    };

const byName = (a: Person, b: Person) =>
  (a.lastName ?? "").localeCompare(b.lastName ?? "") ||
  (a.firstName ?? "").localeCompare(b.firstName ?? "");

/** Works out exactly who would be assigned. Called for the preview AND again when confirming. */
export async function resolveAssignment(input: AssignmentInput): Promise<ResolvedAssignment> {
  const plan = await prisma.lessonPlan.findFirst({
    where: { id: input.planId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      versions: {
        where: { publishedAt: { not: null } },
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { id: true, versionNumber: true },
      },
    },
  });
  const version = plan?.versions[0];
  if (!plan || !version) {
    return { ok: false, message: "Choose a published plan" };
  }

  const start = parseDay(input.startDate, false);
  const due = parseDay(input.dueDate, true);
  if (!start.ok) return { ok: false, message: "The start date is not valid" };
  if (!due.ok) return { ok: false, message: "The due date is not valid" };

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (due.date && due.date.getTime() < today.getTime()) {
    return { ok: false, message: "The due date cannot be in the past" };
  }
  if (start.date && due.date && due.date.getTime() < start.date.getTime()) {
    return { ok: false, message: "The due date cannot be before the start date" };
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

  const existing = await prisma.lessonPlanAssignment.findMany({
    where: { planId: plan.id, studentId: { in: targets.map((t) => t.id) } },
    select: { studentId: true },
  });
  const alreadyAssigned = new Set(existing.map((e) => e.studentId));
  const newStudents = targets.filter((t) => !alreadyAssigned.has(t.id));

  return {
    ok: true,
    planId: plan.id,
    planTitle: plan.title,
    versionId: version.id,
    versionNumber: version.versionNumber,
    targetLabel,
    groupId,
    startDate: start.date,
    dueDate: due.date,
    allTargets: targets.length,
    newStudents,
    skippedCount: targets.length - newStudents.length,
  };
}