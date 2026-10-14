import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createCategory,
  updateCategory,
  setCategoryActive,
} from "./actions";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const inputCompact =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

type Props = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function AdminCategoriesContent({
  searchParams,
}: Props) {
  // SECURITY: verify the current user is an admin on the server.
  await requireAdmin();

  // Resolve request-specific URL parameters inside Suspense.
  const { error, saved } = await searchParams;

  const subjects = await prisma.subject.findMany({
    where: {
      isActive: true,
      children: {
        none: { isActive: true },
      },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      parent: {
        select: { name: true },
      },
      categories: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          sortOrder: true,
          isActive: true,
        },
      },
    },
  });

  const label = (subject: {
    name: string;
    parent: { name: string } | null;
  }) =>
    subject.parent
      ? `${subject.parent.name} ${subject.name}`
      : subject.name;

  const totalCategories = subjects.reduce(
    (sum, s) => sum + s.categories.length,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Categories
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {subjects.length === 0
            ? "No active subjects yet."
            : `${totalCategories} categor${
                totalCategories === 1 ? "y" : "ies"
              } across ${subjects.length} subject${
                subjects.length === 1 ? "" : "s"
              }`}
        </p>
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

      {/* ============ CREATE CATEGORY ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Add a category
          </h2>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-neutral-400">
              No active subjects yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Create or activate a subject before adding categories.
            </p>
            <Link
              href="/admin/subjects"
              className="mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Manage subjects
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M3 8h10m0 0-4-4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        ) : (
          <form
            action={createCategory}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="sm:w-64">
              <label htmlFor="subjectId" className={labelBase}>
                Subject
              </label>
              <select
                id="subjectId"
                name="subjectId"
                required
                className={inputBase}
                defaultValue=""
              >
                <option value="" disabled>
                  Select…
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {label(subject)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="name" className={labelBase}>
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={80}
                className={inputBase}
                placeholder="e.g. Algebra"
              />
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

      {/* ============ SUBJECT SECTIONS ============ */}
      {subjects.map((subject) => (
        <section
          key={subject.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
                {label(subject)}
              </h2>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-500 tabular-nums">
              {subject.categories.length} categor
              {subject.categories.length === 1 ? "y" : "ies"}
            </span>
          </div>

          {subject.categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-neutral-400">
                No categories yet.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Add one above using the subject selector.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {subject.categories.map((category) => (
                <li
                  key={category.id}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                    category.isActive
                      ? "border-white/10 bg-white/[0.02] hover:border-white/20"
                      : "border-white/5 bg-white/[0.01] opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Inline edit form */}
                  <form
                    action={updateCategory}
                    className="flex flex-1 flex-wrap items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={category.id}
                    />

                    <input
                      name="name"
                      defaultValue={category.name}
                      required
                      maxLength={80}
                      aria-label="Category name"
                      className={`${inputCompact} min-w-0 flex-1`}
                    />

                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={10000}
                      defaultValue={category.sortOrder}
                      aria-label="Display order"
                      className={`${inputCompact} w-20 text-center tabular-nums`}
                    />

                    <button
                      type="submit"
                      className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      Save
                    </button>
                  </form>

                  {/* Active toggle */}
                  <form action={setCategoryActive}>
                    <input
                      type="hidden"
                      name="id"
                      value={category.id}
                    />
                    <input
                      type="hidden"
                      name="active"
                      value={category.isActive ? "false" : "true"}
                    />

                    <button
                      type="submit"
                      className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors ${
                        category.isActive
                          ? "border-transparent text-neutral-400 hover:border-rose-400/20 hover:bg-rose-500/[0.08] hover:text-rose-300"
                          : "border-transparent text-emerald-300 hover:border-emerald-400/20 hover:bg-emerald-500/[0.08]"
                      }`}
                    >
                      {category.isActive ? "Archive" : "Restore"}
                    </button>
                  </form>

                  {/* Status pill */}
                  {!category.isActive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                      Archived
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* ============ BACK LINK ============ */}
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