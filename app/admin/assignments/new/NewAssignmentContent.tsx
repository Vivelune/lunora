
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  PRIORITIES,
  readInput,
  resolveAssignment,
} from "@/lib/assignments";
import { createAssignments } from "../actions";

type Params = Record<string, string | string[] | undefined>;

export default async function NewAssignmentContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  // Authenticate and authorize every request before loading admin data.
  await requireAdmin();

  const raw = await searchParams;

  const get = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";

  const [plans, students, groups] = await Promise.all([
    prisma.lessonPlan.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),

    prisma.studentProfile.findMany({
      where: {
        role: "STUDENT",
        onboardingCompletedAt: { not: null },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }),

    prisma.studentGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { memberships: true },
        },
      },
    }),
  ]);

  const parsed = get("preview") === "1" ? readInput(get) : null;

  const resolved =
    parsed?.success
      ? await resolveAssignment(parsed.data)
      : null;

  const previewError =
    parsed && !parsed.success
      ? parsed.error.issues[0].message
      : resolved && !resolved.ok
        ? resolved.message
        : null;

  const field = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  const name = (student: {
    firstName: string | null;
    lastName: string | null;
  }) => `${student.lastName ?? ""}, ${student.firstName ?? ""}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Assign a lesson plan</h1>

        <Link
          href="/admin/assignments"
          className="text-sm underline"
        >
          Back to assignments
        </Link>
      </header>

      {(get("error") || previewError) && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {get("error") || previewError}
        </p>
      )}

      <form
        method="get"
        action="/admin/assignments/new"
        className="flex flex-col gap-4 rounded-lg border p-5"
      >
        <input type="hidden" name="preview" value="1" />

        <div>
          <label htmlFor="planId" className={label}>
            Plan (published plans only)
          </label>

          <select
            id="planId"
            name="planId"
            required
            defaultValue={get("planId")}
            className={field}
          >
            <option value="" disabled>
              Select...
            </option>

            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="targetType" className={label}>
            Assign to
          </label>

          <select
            id="targetType"
            name="targetType"
            required
            defaultValue={get("targetType")}
            className={field}
          >
            <option value="" disabled>
              Select...
            </option>
            <option value="student">One student</option>
            <option value="group">A group</option>
            <option value="all">All eligible students</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="studentId" className={label}>
              Student (if &quot;One student&quot;)
            </label>

            <select
              id="studentId"
              name="studentId"
              defaultValue={get("studentId")}
              className={field}
            >
              <option value="">-</option>

              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {name(student)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="groupId" className={label}>
              Group (if &quot;A group&quot;)
            </label>

            <select
              id="groupId"
              name="groupId"
              defaultValue={get("groupId")}
              className={field}
            >
              <option value="">-</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group._count.memberships})
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Only the field matching &quot;Assign to&quot; is used.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="startDate" className={label}>
              Start date (optional)
            </label>

            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={get("startDate")}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="dueDate" className={label}>
              Due date (optional)
            </label>

            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={get("dueDate")}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="priority" className={label}>
              Priority
            </label>

            <select
              id="priority"
              name="priority"
              defaultValue={get("priority") || "NORMAL"}
              className={field}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0) +
                    priority.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Dates use UTC. A due date runs to the end of that day.
        </p>

        <div>
          <label htmlFor="instructions" className={label}>
            Instructions for students (optional)
          </label>

          <textarea
            id="instructions"
            name="instructions"
            rows={3}
            maxLength={1000}
            defaultValue={get("instructions")}
            className={field}
          />
        </div>

        <button
          type="submit"
          className="self-start rounded bg-black px-5 py-2 text-white"
        >
          Review before assigning
        </button>
      </form>

      {resolved?.ok && parsed?.success && (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-black p-5">
          <h2 className="text-lg font-semibold">Review</h2>

          <ul className="flex flex-col gap-1 text-sm">
            <li>
              Plan: <strong>{resolved.planTitle}</strong> (version{" "}
              {resolved.versionNumber})
            </li>

            <li>
              Target: <strong>{resolved.targetLabel}</strong>
            </li>

            <li>
              Start:{" "}
              {resolved.startDate
                ? resolved.startDate.toISOString().slice(0, 10)
                : "not set"}
            </li>

            <li>
              Due:{" "}
              {resolved.dueDate
                ? resolved.dueDate.toISOString().slice(0, 10)
                : "not set"}
            </li>

            <li>Priority: {parsed.data.priority}</li>
          </ul>

          <p className="rounded bg-gray-100 p-3 text-sm">
            <strong>{resolved.newStudents.length}</strong> student
            {resolved.newStudents.length === 1 ? "" : "s"} will
            receive this plan.
            {resolved.skippedCount > 0 &&
              ` ${resolved.skippedCount} already ${
                resolved.skippedCount === 1 ? "has" : "have"
              } it and will be skipped.`}
          </p>

          {resolved.newStudents.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer">
                Show who will be assigned
              </summary>

              <ul className="mt-2 list-disc pl-6">
                {resolved.newStudents.slice(0, 25).map((student) => (
                  <li key={student.id}>{name(student)}</li>
                ))}

                {resolved.newStudents.length > 25 && (
                  <li>
                    and {resolved.newStudents.length - 25} more
                  </li>
                )}
              </ul>
            </details>
          )}

          {resolved.newStudents.length > 0 && (
            <form
              action={createAssignments}
              className="flex flex-col gap-3"
            >
              <input
                type="hidden"
                name="planId"
                value={parsed.data.planId}
              />

              <input
                type="hidden"
                name="targetType"
                value={parsed.data.targetType}
              />

              <input
                type="hidden"
                name="studentId"
                value={parsed.data.studentId}
              />

              <input
                type="hidden"
                name="groupId"
                value={parsed.data.groupId}
              />

              <input
                type="hidden"
                name="startDate"
                value={parsed.data.startDate}
              />

              <input
                type="hidden"
                name="dueDate"
                value={parsed.data.dueDate}
              />

              <input
                type="hidden"
                name="priority"
                value={parsed.data.priority}
              />

              <input
                type="hidden"
                name="instructions"
                value={parsed.data.instructions}
              />

              <input
                type="hidden"
                name="expectedCount"
                value={resolved.newStudents.length}
              />

              {parsed.data.targetType === "all" && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="confirmAll"
                    value="yes"
                    required
                    className="mt-1"
                  />

                  <span>
                    I understand this assigns the plan to{" "}
                    <strong>{resolved.newStudents.length}</strong>{" "}
                    students.
                  </span>
                </label>
              )}

              <button
                type="submit"
                className="self-start rounded bg-black px-5 py-2 text-white"
              >
                Confirm and assign to {resolved.newStudents.length}
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
