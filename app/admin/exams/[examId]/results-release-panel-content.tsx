import Link from "next/link";
import { getBulkReleaseTargets } from "@/lib/results-release";
import prisma from "@/lib/prisma";
import { releaseExamBulk } from "../release-actions";

export default async function ResultsReleasePanelContent({
  examId,
}: {
  examId: string;
}) {
  const [graded, resultsTargets, explanationTargets, latest] =
    await Promise.all([
      prisma.examAttempt.count({ where: { examId, status: "GRADED" } }),
      getBulkReleaseTargets(examId, "results"),
      getBulkReleaseTargets(examId, "explanations"),
      prisma.examVersion.findFirst({
        where: { examId, publishedAt: { not: null } },
        orderBy: { versionNumber: "desc" },
        select: {
          versionNumber: true,
          resultRelease: true,
          explanationRelease: true,
        },
      }),
    ]);

  if (graded === 0 && !latest) {
    return null;
  }

  const label = (value: string) => value.toLowerCase().replaceAll("_", " ");

  const renderReleaseForm = (
    kind: "results" | "explanations",
    count: number,
    text: string
  ) => {
    const isResults = kind === "results";
    const disabled = count === 0;

    return (
      <form
        action={releaseExamBulk}
        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      >
        <input type="hidden" name="examId" value={examId} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="expectedCount" value={count} />

        <div className="flex items-start gap-3">
          <span
            className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full ${
              isResults
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-indigo-500/15 text-indigo-300"
            }`}
          >
            {isResults ? (
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M4 8.5 6.5 11 12 5.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6.25"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  opacity="0.4"
                />
              </svg>
            ) : (
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {isResults ? "Release results" : "Release explanations"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              {text}
            </p>
          </div>
        </div>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition-colors ${
            disabled
              ? "cursor-not-allowed opacity-60"
              : "hover:border-white/20 hover:bg-white/[0.04]"
          }`}
        >
          <input
            type="checkbox"
            name="confirm"
            value="yes"
            required
            disabled={disabled}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-violet-500"
          />
          <span className="text-neutral-200">
            I understand this releases{" "}
            {isResults ? "scores and correct answers" : "explanations"} for{" "}
            <strong className="font-semibold text-white">
              {count}
            </strong>{" "}
            attempt{count === 1 ? "" : "s"}.
          </span>
        </label>

        <button
          type="submit"
          disabled={disabled}
          className={`inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
            isResults
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:opacity-90"
              : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:opacity-90"
          }`}
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M3.5 8.5 6.5 11.5 12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Release {kind} for {count} attempt{count === 1 ? "" : "s"}
        </button>
      </form>
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
      {/* ============ HEADER ============ */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Results release
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {graded} graded attempt{graded === 1 ? "" : "s"} in total.
          {latest && (
            <>
              {" "}Latest published version (v
              <span className="tabular-nums text-neutral-400">
                {latest.versionNumber}
              </span>
              ): results{" "}
              <span className="text-neutral-300">
                {label(latest.resultRelease)}
              </span>
              , explanations{" "}
              <span className="text-neutral-300">
                {label(latest.explanationRelease)}
              </span>
              .
            </>
          )}
        </p>
      </div>

      {/* ============ INFO NOTE ============ */}
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-500"
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
        <p className="text-xs leading-relaxed text-neutral-500">
          Each attempt follows the policy of the version it was taken on.
          These buttons release attempts that are still hidden. You can review
          any single attempt under{" "}
          <Link
            href={`/admin/attempts?examId=${examId}`}
            className="font-medium text-violet-300 underline-offset-2 transition-colors hover:text-violet-200 hover:underline"
          >
            Exam attempts
          </Link>
          .
        </p>
      </div>

      {/* ============ RELEASE FORMS ============ */}
      <div className="grid gap-4 sm:grid-cols-2">
        {renderReleaseForm(
          "results",
          resultsTargets.length,
          `Show the score and correct answers to ${resultsTargets.length} student attempt(s) that cannot see them yet.`
        )}
        {renderReleaseForm(
          "explanations",
          explanationTargets.length,
          `Show explanations to ${explanationTargets.length} attempt(s) whose results are already visible.`
        )}
      </div>
    </section>
  );
}