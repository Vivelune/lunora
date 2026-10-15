import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createExam } from "../actions";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function NewExamContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();

  const { error } = await searchParams;

  const subjects = await prisma.subject.findMany({
    where: {
      isActive: true,
      children: { none: {} },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      parent: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Exams
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          New exam
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Set up the basics. You&apos;ll add questions and publish the exam in
          the next step.
        </p>
      </header>

      {/* ============ ERROR ============ */}
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

      {/* ============ EMPTY STATE ============ */}
      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-neutral-300">
            No active subjects are available for exams.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Create or activate a subject before creating an exam.
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
        /* ============ FORM CARD ============ */
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
          <form action={createExam} className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className={labelBase}>
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                maxLength={150}
                className={inputBase}
                placeholder="e.g. AP Chemistry — Unit 3 practice exam"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subjectId" className={labelBase}>
                Subject
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  cannot be changed later
                </span>
              </label>
              <select
                id="subjectId"
                name="subjectId"
                required
                defaultValue=""
                className={inputBase}
              >
                <option value="" disabled>
                  Select…
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.parent
                      ? `${subject.parent.name} ${subject.name}`
                      : subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className={labelBase}>
                Description
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  optional
                </span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={1000}
                className={inputBase}
                placeholder="What does this exam cover, and when should students take it?"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
              <button
                type="submit"
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                Create exam
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M3 8h10m0 0-4-4m4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <p className="text-xs text-neutral-500">
                You can edit the title and description after creating.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/exams"
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
        Back to exams 
      </Link>
    </div>
  );
}