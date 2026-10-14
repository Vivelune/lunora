import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createGroup } from "./actions";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function AdminGroupsContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { error, saved } = await searchParams;

  const groups = await prisma.studentGroup.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      _count: {
        select: { memberships: true },
      },
    },
  });

  const activeCount = groups.filter((g) => g.isActive).length;
  const archivedCount = groups.length - activeCount;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Student groups
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {groups.length === 0
            ? "No groups yet. Create one below."
            : `${groups.length} group${groups.length === 1 ? "" : "s"} · ${activeCount} active${
                archivedCount > 0 ? ` · ${archivedCount} archived` : ""
              }`}
        </p>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {/* ============ CREATE FORM ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Create a group
          </h2>
        </div>

        <form
          action={createGroup}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="sm:w-56">
            <label htmlFor="name" className={labelBase}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              className={inputBase}
              placeholder="e.g. Spring 2026 SAT"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="description" className={labelBase}>
              Description
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                optional
              </span>
            </label>
            <input
              id="description"
              name="description"
              maxLength={300}
              className={inputBase}
              placeholder="A short note about this group."
            />
          </div>

          <button
            type="submit"
            className="group inline-flex h-[42px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
          >
            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Create
          </button>
        </form>
      </section>

      {/* ============ GROUPS LIST ============ */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            All groups
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {groups.length === 0
              ? "No groups yet."
              : "Click a group to manage its members."}
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">No groups yet.</p>
            <p className="mt-1 text-xs text-neutral-500">
              Create your first group above to get started.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/admin/groups/${group.id}`}
                  className={`group flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                    group.isActive
                      ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      : "border-white/5 bg-white/[0.02] opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* Left: status dot + name + description */}
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span
                      className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                        group.isActive
                          ? "bg-gradient-to-br from-indigo-400 to-fuchsia-400"
                          : "bg-neutral-700"
                      }`}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">
                          {group.name}
                        </p>

                        {!group.isActive && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                            Archived
                          </span>
                        )}
                      </div>

                      {group.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-neutral-400">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: member count + chevron */}
                  <div className="flex flex-shrink-0 items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3"
                      >
                        <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                        <path
                          d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="tabular-nums">
                        {group._count.memberships}
                      </span>
                    </span>

                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
                    >
                      <path
                        d="M6 3.5 10.5 8 6 12.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path
            d="M13 8H3m0 0 4-4M3 8l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to admin
      </Link>
    </div>
  );
}