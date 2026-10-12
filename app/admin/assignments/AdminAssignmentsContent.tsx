
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import  prisma  from "@/lib/prisma";
import { setAssignmentStatus } from "./actions";

const PAGE_SIZE = 50;

type AssignmentSearchParams = {
  error?: string;
  saved?: string;
  status?: string;
  planId?: string;
  page?: string;
};

export default async function AdminAssignmentsContent({
  searchParams,
}: {
  searchParams: Promise<AssignmentSearchParams>;
}) {
  // Keep authorization inside the server component.
  // Do not cache this request-specific authentication check.
  await requireAdmin();

  const { error, saved, status, planId, page } = await searchParams;

  const pageNumber = Math.max(
    1,
    Number.parseInt(page ?? "1", 10) || 1
  );

    // "as const" keeps these as the exact enum values instead of widening to string.
    const statusFilter =
    status === "ACTIVE"
      ? ("ACTIVE" as const)
      : status === "CANCELLED"
        ? ("CANCELLED" as const)
        : undefined;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(planId ? { planId } : {}),
  };

  const [total, rows, plans] = await Promise.all([
    prisma.lessonPlanAssignment.count({ where }),

    prisma.lessonPlanAssignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        dueDate: true,
        startedAt: true,
        completedAt: true,
        priority: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
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
          },
        },
        group: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.lessonPlan.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const now = new Date();

  const progressLabel = (assignment: (typeof rows)[number]) => {
    if (assignment.status === "CANCELLED") {
      return "Cancelled";
    }

    if (assignment.completedAt) {
      return "Completed";
    }

    if (assignment.startedAt) {
      return "In progress";
    }

    return "Not started";
  };

  const isOverdue = (assignment: (typeof rows)[number]) =>
    assignment.status === "ACTIVE" &&
    !assignment.completedAt &&
    assignment.dueDate !== null &&
    assignment.dueDate.getTime() < now.getTime();

  const pageCount = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const linkFor = (targetPage: number) => {
    const params = new URLSearchParams();

    if (statusFilter) {
      params.set("status", statusFilter);
    }

    if (planId) {
      params.set("planId", planId);
    }

    params.set("page", String(targetPage));

    return `/admin/assignments?${params.toString()}`;
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Assignments</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="underline">
            Admin home
          </Link>

          <Link
            href="/admin/assignments/new"
            className="rounded bg-black px-3 py-1.5 text-white"
          >
            Assign a plan
          </Link>
        </div>
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

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 text-sm"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="font-medium">
            Status
          </label>

          <select
            id="status"
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded border px-2 py-1"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="planId" className="font-medium">
            Plan
          </label>

          <select
            id="planId"
            name="planId"
            defaultValue={planId ?? ""}
            className="rounded border px-2 py-1"
          >
            <option value="">All plans</option>

            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded border px-3 py-1"
        >
          Filter
        </button>
      </form>

      <p className="text-sm text-gray-600">
        {total} assignment{total === 1 ? "" : "s"}
      </p>

      {rows.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-gray-500">
          No assignments match.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3">Student</th>
                <th className="pr-3">Plan</th>
                <th className="pr-3">From group</th>
                <th className="pr-3">Due</th>
                <th className="pr-3">Priority</th>
                <th className="pr-3">Progress</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((assignment) => (
                <tr key={assignment.id} className="border-b">
                  <td className="py-2 pr-3">
                    {assignment.student.lastName},{" "}
                    {assignment.student.firstName}
                  </td>

                  <td className="pr-3">
                    {assignment.plan.title} (v
                    {assignment.version.versionNumber})
                  </td>

                  <td className="pr-3">
                    {assignment.group?.name ?? "-"}
                  </td>

                  <td className="pr-3">
                    {assignment.dueDate
                      ? assignment.dueDate.toISOString().slice(0, 10)
                      : "-"}
                  </td>

                  <td className="pr-3">
                    {assignment.priority}
                  </td>

                  <td className="pr-3">
                    {progressLabel(assignment)}

                    {isOverdue(assignment) && (
                      <span className="ml-2 whitespace-nowrap rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        Overdue
                      </span>
                    )}
                  </td>

                  <td>
                    {assignment.status === "ACTIVE" &&
                      !assignment.completedAt && (
                        <form action={setAssignmentStatus}>
                          <input
                            type="hidden"
                            name="id"
                            value={assignment.id}
                          />

                          <input
                            type="hidden"
                            name="to"
                            value="CANCELLED"
                          />

                          <button
                            type="submit"
                            className="text-red-700 underline"
                          >
                            Cancel
                          </button>
                        </form>
                      )}

                    {assignment.status === "CANCELLED" && (
                      <form action={setAssignmentStatus}>
                        <input
                          type="hidden"
                          name="id"
                          value={assignment.id}
                        />

                        <input
                          type="hidden"
                          name="to"
                          value="ACTIVE"
                        />

                        <button
                          type="submit"
                          className="underline"
                        >
                          Restore
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Assignment pages"
          className="flex items-center gap-4 text-sm"
        >
          {pageNumber > 1 && (
            <Link
              href={linkFor(pageNumber - 1)}
              className="underline"
            >
              Previous
            </Link>
          )}

          <span>
            Page {pageNumber} of {pageCount}
          </span>

          {pageNumber < pageCount && (
            <Link
              href={linkFor(pageNumber + 1)}
              className="underline"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
