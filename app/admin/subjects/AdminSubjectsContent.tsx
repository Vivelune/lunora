import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AdminSubjectsContent() {
  // Protect this page on the server.
  await requireAdmin();

  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      parent: {
        select: { name: true },
      },
      _count: {
        select: { categories: true },
      },
    },
  });

  const activeCount = subjects.filter((s) => s.isActive).length;
  const archivedCount = subjects.length - activeCount;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Subjects
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {subjects.length === 0
            ? "No subjects have been created yet."
            : `${subjects.length} total · ${activeCount} active · ${archivedCount} archived`}
        </p>
      </header>

      {/* ============ EMPTY STATE ============ */}
      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">
            No subjects have been created yet.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Subjects will appear here once they&apos;re added.
          </p>
        </div>
      ) : (
        /* ============ TABLE ============ */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Subject
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Slug
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Categories
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {subjects.map((subject) => (
                  <tr
                    key={subject.id}
                    className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    {/* Subject name + parent */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            subject.isActive
                              ? "bg-gradient-to-br from-indigo-400 to-fuchsia-400"
                              : "bg-neutral-700"
                          }`}
                        />
                        <div className="min-w-0">
                          {subject.parent && (
                            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                              {subject.parent.name}
                            </p>
                          )}
                          <p className="truncate font-medium text-white">
                            {subject.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-4">
                      <code className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 text-xs text-neutral-400">
                        {subject.slug}
                      </code>
                    </td>

                    {/* Categories count */}
                    <td className="px-5 py-4">
                      <span className="tabular-nums text-neutral-300">
                        {subject._count.categories}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {subject.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ FOOTER BACK LINK ============ */}
      <Link
        href="/admin"
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
        Back to admin
      </Link>
    </div>
  );
}