import { getPublishProblems } from "@/lib/exam-validation";
import prisma from "@/lib/prisma";
import {
  duplicateExam,
  publishExam,
  setExamLive,
  startNewExamVersion,
} from "../publish-actions";

export default async function PublishPanelContent({
  examId,
}: {
  examId: string;
}) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      status: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          publishedAt: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      },
    },
  });

  if (!exam) {
    return null;
  }

  const working =
    exam.versions.find((version) => version.publishedAt === null) ?? null;

  const hasPublished = exam.versions.some(
    (version) => version.publishedAt !== null,
  );

  const archived = exam.status === "ARCHIVED";

  const problems = working ? await getPublishProblems(working.id) : [];

  const hidden = (name: string, value: string) => (
    <input type="hidden" name={name} value={value} />
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
      {/* ============ HEADER ============ */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Publishing
          </h2>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          {exam.status === "PUBLISHED" &&
            "Live — students can be assigned once those features exist."}
          {exam.status === "DRAFT" &&
            (hasPublished
              ? "Not live — you've unpublished a previously published version."
              : "Draft — publish when the exam is ready.")}
          {exam.status === "ARCHIVED" &&
            "Archived — restore to edit or publish again."}
        </p>
      </div>

      {/* ============ PUBLISH CHECKLIST ============ */}
      {working && !archived && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Publish checklist for version {working.versionNumber}
          </h3>

          {problems.length === 0 ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3">
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-emerald-200">
                  Ready to publish
                </p>
                <p className="mt-0.5 text-xs text-emerald-300/70">
                  {working._count.questions} question{working._count.questions === 1 ? "" : "s"} checked.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-4">
              <p className="text-sm font-medium text-rose-200">
                Fix {problems.length} issue{problems.length === 1 ? "" : "s"} before publishing
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {problems.map((problem, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-rose-200/90">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-rose-400" />
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <form action={publishExam}>
              {hidden("examId", examId)}
              <button
                type="submit"
                disabled={problems.length > 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Publish version {working.versionNumber}
              </button>
            </form>

            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              Publishing freezes this version. To change it later, create a new version. Published versions remain unchanged.
            </p>
          </div>
        </div>
      )}

      {/* ============ ACTIONS ============ */}
      <div className="mb-5 flex flex-wrap gap-2">
        {!working && !archived && hasPublished && (
          <form action={startNewExamVersion}>
            {hidden("examId", examId)}
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
            >
              Create new version to edit
            </button>
          </form>
        )}

        {exam.status === "PUBLISHED" && (
          <form action={setExamLive}>
            {hidden("examId", examId)}
            {hidden("live", "false")}
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/[0.06] px-5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/[0.12]"
            >
              Unpublish (stop new attempts)
            </button>
          </form>
        )}

        {exam.status === "DRAFT" && hasPublished && (
          <form action={setExamLive}>
            {hidden("examId", examId)}
            {hidden("live", "true")}
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
            >
              Make live again
            </button>
          </form>
        )}

        <form action={duplicateExam}>
          {hidden("examId", examId)}
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
          >
            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6 12.5h6.5V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Duplicate exam
          </button>
        </form>
      </div>

      {/* ============ VERSION HISTORY ============ */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Version history
        </h3>

        <ul className="flex flex-col gap-2">
          {exam.versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                  v{version.versionNumber}
                </span>
                <span className="text-sm text-neutral-400">
                  {version._count.questions} question
                  {version._count.questions === 1 ? "" : "s"}
                </span>
              </div>

              {version.publishedAt ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                  Published{" "}
                  <span className="tabular-nums text-neutral-400">
                    {version.publishedAt.toISOString().slice(0, 10)}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  <span className="h-1 w-1 rounded-full bg-amber-400" />
                  Editable
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}