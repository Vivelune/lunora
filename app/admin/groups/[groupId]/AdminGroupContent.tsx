
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/validation/profile";
import {
  addMember,
  removeMember,
  setGroupActive,
} from "../actions";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function AdminGroupContent({
  params,
  searchParams,
}: Props) {
  await requireAdmin();

  const [{ groupId }, { error, saved }] = await Promise.all([
    params,
    searchParams,
  ]);

  const group = await prisma.studentGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      memberships: {
        orderBy: {
          student: { lastName: "asc" },
        },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gradeLevel: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    notFound();
  }

  const available = await prisma.studentProfile.findMany({
    where: {
      role: "STUDENT",
      onboardingCompletedAt: { not: null },
      groupMemberships: {
        none: { groupId },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gradeLevel: true,
    },
  });

  const grade = (value: string | null) =>
    value
      ? GRADE_LABELS[value as keyof typeof GRADE_LABELS] ?? value
      : "-";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>

          {group.description && (
            <p className="text-sm text-gray-600">
              {group.description}
            </p>
          )}

          {!group.isActive && (
            <p className="text-sm text-gray-500">
              This group is archived.
            </p>
          )}
        </div>

        <Link href="/admin/groups" className="text-sm underline">
          Back to groups
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

      <form action={setGroupActive}>
        <input type="hidden" name="id" value={group.id} />
        <input
          type="hidden"
          name="active"
          value={group.isActive ? "false" : "true"}
        />

        <button
          type="submit"
          className="rounded border px-3 py-1.5 text-sm"
        >
          {group.isActive ? "Archive group" : "Restore group"}
        </button>
      </form>

      {group.isActive && (
        <section className="rounded-lg border p-5">
          <h2 className="mb-3 text-lg font-semibold">
            Add a student
          </h2>

          {available.length === 0 ? (
            <p className="text-sm text-gray-500">
              No more students available to add.
            </p>
          ) : (
            <form
              action={addMember}
              className="flex flex-wrap items-end gap-3"
            >
              <input
                type="hidden"
                name="groupId"
                value={group.id}
              />

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="studentId"
                  className="text-sm font-medium"
                >
                  Student
                </label>

                <select
                  id="studentId"
                  name="studentId"
                  required
                  defaultValue=""
                  className="rounded border px-3 py-2"
                >
                  <option value="" disabled>
                    Select...
                  </option>

                  {available.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.lastName}, {student.firstName} (
                      {grade(student.gradeLevel)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-white"
              >
                Add
              </button>
            </form>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Members ({group.memberships.length})
        </h2>

        {group.memberships.length === 0 ? (
          <p className="rounded border border-dashed p-4 text-sm text-gray-500">
            No members yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {group.memberships.map(({ student }) => (
              <li
                key={student.id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <span>
                  {student.lastName}, {student.firstName}
                  <span className="text-gray-500">
                    {" "}- {grade(student.gradeLevel)}
                  </span>
                </span>

                <form action={removeMember}>
                  <input
                    type="hidden"
                    name="groupId"
                    value={group.id}
                  />
                  <input
                    type="hidden"
                    name="studentId"
                    value={student.id}
                  />

                  <button
                    type="submit"
                    className="text-red-700 underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
