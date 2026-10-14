import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/validation/profile";
import { addMember, removeMember, setGroupActive } from "../actions";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

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
      : "—";

  const initials = (first: string | null, last: string | null) =>
    `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";

  const displayName = (first: string | null, last: string | null) =>
    `${last ?? "—"}, ${first ?? "—"}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Student groups
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {group.name}
        </h1>

        {group.description && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            {group.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {group.isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
              Archived
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3 w-3"
            >
              <circle
                cx="6"
                cy="6"
                r="2.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span className="tabular-nums">
              {group.memberships.length}
            </span>{" "}
            member{group.memberships.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <circle
              cx="8"
              cy="8"
              r="6.25"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <path
              d="M3.5 8.5 6.5 11.5 12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {/* ============ GROUP CONTROLS ============ */}
      <section className="flex flex-wrap items-center gap-2">
        <form action={setGroupActive}>
          <input type="hidden" name="id" value={group.id} />
          <input
            type="hidden"
            name="active"
            value={group.isActive ? "false" : "true"}
          />
          <button
            type="submit"
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${
              group.isActive
                ? "border border-rose-400/20 bg-rose-500/[0.06] text-rose-200 hover:bg-rose-500/[0.12]"
                : "border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08]"
            }`}
          >
            {group.isActive ? "Archive group" : "Restore group"}
          </button>
        </form>
      </section>

      {/* ============ ADD MEMBER ============ */}
      {group.isActive && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Add a student
            </h2>
          </div>

          {available.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-neutral-400">
                No more students available to add.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Every eligible student is already in this group.
              </p>
            </div>
          ) : (
            <form
              action={addMember}
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="groupId" value={group.id} />

              <div className="min-w-0 flex-1">
                <label htmlFor="studentId" className={labelBase}>
                  Student
                </label>
                <select
                  id="studentId"
                  name="studentId"
                  required
                  defaultValue=""
                  className={inputBase}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {available.map((student) => (
                    <option key={student.id} value={student.id}>
                      {displayName(student.firstName, student.lastName)} (
                      {grade(student.gradeLevel)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="group inline-flex h-[42px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M8 3.5v9M3.5 8h9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Add
              </button>
            </form>
          )}
        </section>
      )}

      {/* ============ MEMBERS ============ */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Members
            <span className="ml-2 text-sm font-normal text-neutral-500 tabular-nums">
              ({group.memberships.length})
            </span>
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {group.memberships.length === 0
              ? "No members yet."
              : "Students currently in this group."}
          </p>
        </div>

        {group.memberships.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">No members yet.</p>
            {group.isActive && available.length > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                Use the form above to add your first student.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {group.memberships.map(({ student }) => (
              <li
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Initial avatar */}
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-400/30 to-fuchsia-400/30 text-[11px] font-semibold text-white">
                    {initials(student.firstName, student.lastName)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {displayName(student.firstName, student.lastName)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {grade(student.gradeLevel)}
                    </p>
                  </div>
                </div>

                <form action={removeMember}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input
                    type="hidden"
                    name="studentId"
                    value={student.id}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-lg border border-transparent px-3 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/groups"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5"
        >
          <path
            d="M13 8H3m0 0 4-4M3 8l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to groups
      </Link>
    </div>
  );
}