
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { computeItemStates } from "@/lib/plan-progress";
import prisma from "@/lib/prisma";
import { setAssignmentStatus } from "../actions";
import {
  moveAssignmentToLatest,
  updateAssignmentDetails,
} from "../manage-actions";

const date = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "-";

const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default async function AssignmentDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { assignmentId } = await params;
  const { error, saved } = await searchParams;

  const assignment = await prisma.lessonPlanAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      planId: true,
      versionId: true,
      status: true,
      assignedAt: true,
      startDate: true,
      dueDate: true,
      startedAt: true,
      completedAt: true,
      priority: true,
      instructions: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          gradeLevel: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
      plan: {
        select: {
          title: true,
        },
      },
      version: {
        select: {
          versionNumber: true,
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              isRequired: true,
              lesson: {
                select: {
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      progress: {
        select: {
          itemId: true,
          completedAt: true,
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const latest = await prisma.lessonPlanVersion.findFirst({
    where: {
      planId: assignment.planId,
      publishedAt: { not: null },
    },
    orderBy: {
      versionNumber: "desc",
    },
    select: {
      id: true,
      versionNumber: true,
    },
  });

  const items = assignment.version.items;

  const completedAtByItem = new Map(
    assignment.progress.map((p) => [p.itemId, p.completedAt]),
  );

  const states = computeItemStates(
    items,
    new Set(completedAtByItem.keys()),
  );

  const required = items.filter((item) => item.isRequired);

  const requiredDone = required.filter((item) =>
    completedAtByItem.has(item.id),
  ).length;

  const percent =
    required.length === 0
      ? 0
      : Math.round((requiredDone / required.length) * 100);

  const nextItem = items.find(
    (item) => states.get(item.id) === "AVAILABLE",
  );

  const overdue =
    assignment.status === "ACTIVE" &&
    !assignment.completedAt &&
    assignment.dueDate !== null &&
    assignment.dueDate.getTime() < Date.now();

  const canMove =
    assignment.status === "ACTIVE" &&
    !assignment.completedAt &&
    latest !== null &&
    latest.id !== assignment.versionId;

  const status =
    assignment.status === "CANCELLED"
      ? "Cancelled"
      : assignment.completedAt
        ? "Completed"
        : assignment.startedAt
          ? "In progress"
          : "Not started";

  const field = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {assignment.student.lastName},{" "}
            {assignment.student.firstName}
          </h1>

          <p className="text-gray-600">
            {assignment.plan.title} (version{" "}
            {assignment.version.versionNumber})
            {assignment.group && ` - from group ${assignment.group.name}`}
          </p>
        </div>

        <Link href="/admin/assignments" className="text-sm underline">
          Back to assignments
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700"
        >
          {saved}
        </p>
      )}

      <section className="grid gap-3 rounded-lg border p-5 text-sm sm:grid-cols-2">
        <p>
          Status: <strong>{status}</strong>
          {overdue && (
            <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
              Overdue
            </span>
          )}
        </p>

        <p>
          Priority: <strong>{assignment.priority}</strong>
        </p>

        <p>Assigned: {date(assignment.assignedAt)}</p>
        <p>Starts: {date(assignment.startDate)}</p>
        <p>Due: {date(assignment.dueDate)}</p>

        <p>
          First lesson completed:{" "}
          {assignment.startedAt ? stamp(assignment.startedAt) : "-"}
        </p>

        <p>
          Plan completed:{" "}
          {assignment.completedAt ? stamp(assignment.completedAt) : "-"}
        </p>

        <p>
          Required lessons: {requiredDone} of {required.length} ({percent}%)
        </p>

        {nextItem &&
          assignment.status === "ACTIVE" &&
          !assignment.completedAt && (
            <p className="sm:col-span-2">
              Next step for the student:{" "}
              <strong>
                {nextItem.lesson?.title ?? "Lesson unavailable"}
              </strong>
            </p>
          )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Lessons in this version
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3">#</th>
                <th className="pr-3">Lesson</th>
                <th className="pr-3">Type</th>
                <th className="pr-3">State</th>
                <th>Completed</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const state = states.get(item.id);
                const done = completedAtByItem.get(item.id);

                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 pr-3">{index + 1}</td>

                    <td className="pr-3">
                      {item.lesson?.title ?? "(missing)"}

                      {item.lesson &&
                        item.lesson.status !== "PUBLISHED" && (
                          <span className="ml-2 text-xs text-amber-700">
                            lesson is {item.lesson.status.toLowerCase()}
                          </span>
                        )}
                    </td>

                    <td className="pr-3">
                      {item.isRequired ? "Required" : "Optional"}
                    </td>

                    <td className="pr-3">
                      {state === "COMPLETED"
                        ? "Completed"
                        : state === "AVAILABLE"
                          ? "Incomplete (available)"
                          : "Incomplete (locked)"}
                    </td>

                    <td>{done ? stamp(done) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {canMove && latest && (
        <section className="rounded-lg border p-5">
          <h2 className="mb-1 text-lg font-semibold">
            A newer version is available
          </h2>

          <p className="mb-3 text-sm text-gray-600">
            Version {latest.versionNumber} is published. Moving keeps
            completed lessons that also appear in the new version. Lessons
            not in the new version are no longer counted.
          </p>

          <form action={moveAssignmentToLatest}>
            <input
              type="hidden"
              name="assignmentId"
              value={assignment.id}
            />

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm"
            >
              Move to version {latest.versionNumber}
            </button>
          </form>
        </section>
      )}

      {assignment.status === "ACTIVE" && (
        <section className="rounded-lg border p-5">
          <h2 className="mb-3 text-lg font-semibold">Edit assignment</h2>

          <form
            action={updateAssignmentDetails}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={assignment.id} />

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="startDate" className={label}>
                  Start date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={
                    assignment.startDate
                      ? assignment.startDate.toISOString().slice(0, 10)
                      : ""
                  }
                  className={field}
                />
              </div>

              <div>
                <label htmlFor="dueDate" className={label}>
                  Due date
                </label>

                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={
                    assignment.dueDate
                      ? assignment.dueDate.toISOString().slice(0, 10)
                      : ""
                  }
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
                  defaultValue={assignment.priority}
                  className={field}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="instructions" className={label}>
                Instructions for the student
              </label>

              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                maxLength={1000}
                defaultValue={assignment.instructions ?? ""}
                className={field}
              />
            </div>

            <button
              type="submit"
              className="self-start rounded bg-black px-5 py-2 text-white"
            >
              Save changes
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        {assignment.status === "ACTIVE" && !assignment.completedAt && (
          <form action={setAssignmentStatus}>
            <input type="hidden" name="id" value={assignment.id} />
            <input type="hidden" name="to" value="CANCELLED" />

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm text-red-700"
            >
              Cancel assignment
            </button>
          </form>
        )}

        {assignment.status === "CANCELLED" && (
          <form action={setAssignmentStatus}>
            <input type="hidden" name="id" value={assignment.id} />
            <input type="hidden" name="to" value="ACTIVE" />

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm"
            >
              Restore assignment
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
