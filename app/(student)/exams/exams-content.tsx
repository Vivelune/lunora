import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentExams } from "@/lib/student-exams";
import { ExamCard } from "./exam-card";

const emptyState =
  "rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center";

export default async function ExamsContent() {
  const { profile } = await requireCompletedProfile();
  const { assigned, practice } = await getStudentExams(profile.id);

  const available = assigned.filter((e) => e.state === "AVAILABLE");
  const upcoming = assigned.filter((e) => e.state === "UPCOMING");
  const closed = assigned.filter(
    (e) => e.state === "CLOSED" || e.state === "UNAVAILABLE"
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Exams
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          My exams
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {available.length > 0
            ? `${available.length} exam${
                available.length === 1 ? "" : "s"
              } open for you right now.`
            : "Nothing open right now."}
        </p>
      </header>

      {/* ============ STATUS NOTICE ============ */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.06] px-4 py-3.5">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-indigo-500/15 text-indigo-300">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4"
          >
            <circle
              cx="8"
              cy="8"
              r="6.25"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M8 5v3M8 10.5h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-sm font-medium text-indigo-200">
            Exams are coming soon
          </p>
          <p className="mt-0.5 text-xs text-indigo-300/70">
            For now, you can see what&apos;s assigned to you and when it opens.
          </p>
        </div>
      </div>

      {/* ============ ASSIGNED TO YOU ============ */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Assigned to you
          </h2>
        </div>

        {available.length === 0 ? (
          <div className={emptyState}>
            <p className="text-sm text-neutral-400">
              No exams are open for you right now.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              When your tutor assigns an exam that&apos;s open, it will appear
              here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {available.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        )}
      </section>

      {/* ============ COMING UP ============ */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Coming up
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        </section>
      )}

      {/* ============ PRACTICE EXAMS ============ */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Practice exams
          </h2>
        </div>

        {practice.length === 0 ? (
          <div className={emptyState}>
            <p className="text-sm text-neutral-400">
              No practice exams available.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Open practice exams will appear here as they&apos;re published.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {practice.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        )}
      </section>

      {/* ============ CLOSED OR UNAVAILABLE ============ */}
      {closed.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Closed or unavailable
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {closed.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        </section>
      )}

      {/* ============ BACK LINK ============ */}
      <Link
        href="/dashboard"
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
        Back to dashboard
      </Link>
    </div>
  );
}