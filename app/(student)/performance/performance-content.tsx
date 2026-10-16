import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { loadAttemptFacts, loadTopicAnswers } from "@/lib/analytics";
import {
  bestPerExam,
  bySubject,
  summarize,
  topicStats,
  trendPoints,
  type Summary,
  type TopicLabel,
} from "@/lib/analytics-core";
import { formatHundredths } from "@/lib/points";

const day = (d: Date) => d.toISOString().slice(0, 10);
const pct = (hundredths: number | null) =>
  hundredths === null ? "—" : `${formatHundredths(hundredths)}%`;
const ratio = (earned: number, possible: number) =>
  possible > 0 ? (earned * 10000) / possible : 0;

const TOPIC_TEXT: Record<TopicLabel, string> = {
  STRONG: "Strong",
  DEVELOPING: "Developing",
  NEEDS_ATTENTION: "Needs attention",
};

export default async function PerformanceContent() {
  const { profile } = await requireCompletedProfile();

  // Only attempts whose results are released. Hidden scores never reach this page.
  const facts = await loadAttemptFacts({
    studentId: profile.id,
    releasedOnly: true,
  });
  const overall = summarize(facts);
  const subjects = bySubject(facts);
  const trend = trendPoints(facts);

  const bestIds = new Set(bestPerExam(facts).map((f) => f.attemptId));
  const answers = await loadTopicAnswers([...bestIds]);
  const topics = topicStats(answers, bestIds);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Performance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          My performance
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {facts.length === 0
            ? "No graded exams with released results yet."
            : `${overall.examsCompleted} exam${
                overall.examsCompleted === 1 ? "" : "s"
              } completed across ${overall.attempts} attempt${
                overall.attempts === 1 ? "" : "s"
              }.`}
        </p>
      </header>

      {/* ============ EMPTY STATE ============ */}
      {facts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">
            Your performance will appear here.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Complete a graded exam and wait for its results to be released.
          </p>
        </div>
      ) : (
        <>
          {/* ============ OVERALL ============ */}
          <section>
            <div className="mb-4">
              <SectionHeader dot="from-indigo-400 to-violet-400" label="Overall" />
            </div>
            <Metrics summary={overall} />
          </section>

          {/* ============ METHODOLOGY ============ */}
          <details className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur open:bg-white/[0.03]">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium text-neutral-200 transition-colors hover:text-white">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3 flex-shrink-0 transition-transform group-open:rotate-90"
              >
                <path
                  d="M6 3.5 10.5 8 6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              How these numbers are calculated
            </summary>
            <ul className="flex flex-col gap-2 border-t border-white/5 px-5 py-4 text-xs leading-relaxed text-neutral-400">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400/60" />
                <span>
                  <strong className="font-medium text-neutral-300">
                    Latest score:
                  </strong>{" "}
                  your most recent graded attempt.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400/60" />
                <span>
                  <strong className="font-medium text-neutral-300">
                    Best score:
                  </strong>{" "}
                  your highest single attempt.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400/60" />
                <span>
                  <strong className="font-medium text-neutral-300">
                    Average:
                  </strong>{" "}
                  total points earned divided by total points possible, using
                  only the best attempt of each exam. Exams worth more points
                  count for more.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400/60" />
                <span>
                  <strong className="font-medium text-neutral-300">
                    Exams completed
                  </strong>{" "}
                  counts different exams. Attempts counts every try.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400/60" />
                <span>
                  Attempts whose results have not been released yet are not
                  included.
                </span>
              </li>
            </ul>
          </details>

          {/* ============ PER SUBJECT ============ */}
          {subjects.map((subject) => {
            const subjectTopics = topics.filter(
              (t) => t.subjectId === subject.subjectId
            );

            return (
              <section key={subject.subjectId}>
                <div className="mb-4">
                  <SectionHeader
                    dot="from-sky-400 to-indigo-400"
                    label={subject.subjectName}
                  />
                </div>

                <Metrics summary={subject.summary} />

                {/* Topics */}
                <div className="mt-8 mb-4">
                  <SectionHeader
                    dot="from-violet-400 to-fuchsia-400"
                    label="Topics"
                  />
                </div>

                {subjectTopics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                    <p className="text-sm text-neutral-400">
                      Not enough answers yet.
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Topics appear once you&apos;ve answered at least 5
                      questions in them.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {subjectTopics.map((t) => (
                      <li
                        key={t.categoryId}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {t.name}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                            {formatHundredths(t.earnedHundredths)} of{" "}
                            {formatHundredths(t.possibleHundredths)} points ·{" "}
                            {t.questions} question
                            {t.questions === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="text-base font-semibold tracking-tight text-white tabular-nums">
                            {pct(t.percentHundredths)}
                          </span>
                          <TopicPill label={t.label} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {/* ============ ATTEMPT HISTORY ============ */}
          <section>
            <div className="mb-4">
              <SectionHeader dot="from-emerald-400 to-teal-400" label="Attempt history" />
              <p className="mt-2 text-sm text-neutral-500">
                Every graded attempt, oldest first.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Date
                      </th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Exam
                      </th>
                      <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell">
                        Subject
                      </th>
                      <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell">
                        Type
                      </th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((p) => (
                      <tr
                        key={p.attemptId}
                        className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <span className="tabular-nums text-neutral-400">
                            {day(p.endedAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="truncate font-medium text-white">
                            {p.examTitle}
                          </span>
                        </td>
                        <td className="hidden px-5 py-4 text-neutral-400 sm:table-cell">
                          {p.subjectName}
                        </td>
                        <td className="hidden px-5 py-4 md:table-cell">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                              p.assigned
                                ? "border-violet-400/30 bg-violet-500/10 text-violet-300"
                                : "border-white/10 bg-white/[0.03] text-neutral-400"
                            }`}
                          >
                            {p.assigned ? "Assigned" : "Practice"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-white tabular-nums">
                            {pct(p.percentHundredths)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============ BACK LINKS ============ */}
      <div className="flex flex-wrap items-center gap-5">
        <Link
          href="/results"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          My results
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M6 3.5 10.5 8 6 12.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
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
    </div>
  );
}

/* ============================================================
   Metrics — 4-up summary grid
   ============================================================ */
function Metrics({ summary }: { summary: Summary }) {
  const latest = summary.latest;
  const best = summary.best;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Latest score"
        value={
          latest
            ? pct(
                Math.round(
                  ratio(latest.earnedHundredths, latest.possibleHundredths)
                )
              )
            : "—"
        }
        hint={latest ? `${latest.examTitle} · ${day(latest.endedAt)}` : undefined}
        tone="violet"
      />

      <MetricCard
        label="Best score"
        value={
          best
            ? pct(
                Math.round(
                  ratio(best.earnedHundredths, best.possibleHundredths)
                )
              )
            : "—"
        }
        hint={best ? `${best.examTitle} · ${day(best.endedAt)}` : undefined}
        tone="emerald"
      />

      <MetricCard
        label="Average"
        value={pct(summary.averageHundredths)}
        hint={
          summary.averageHundredths !== null
            ? `${formatHundredths(summary.weightedEarned)} of ${formatHundredths(
                summary.weightedPossible
              )} pts · best attempt each`
            : undefined
        }
        tone="indigo"
      />

      <MetricCard
        label="Exams completed"
        value={String(summary.examsCompleted)}
        hint={`${summary.attempts} attempt${
          summary.attempts === 1 ? "" : "s"
        } (${summary.assignedAttempts} assigned, ${
          summary.practiceAttempts
        } practice)`}
        tone="neutral"
      />
    </div>
  );
}

/* ============================================================
   MetricCard
   ============================================================ */
function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "violet" | "emerald" | "indigo" | "neutral";
}) {
  const accents: Record<typeof tone, string> = {
    violet: "from-violet-400 to-fuchsia-400",
    emerald: "from-emerald-400 to-teal-400",
    indigo: "from-indigo-400 to-sky-400",
    neutral: "from-neutral-500 to-neutral-600",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
      <div
        aria-hidden
        className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${accents[tone]} opacity-20 blur-2xl`}
      />

      <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>

      {hint && (
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   SectionHeader
   ============================================================ */
function SectionHeader({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${dot}`} />
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
        {label}
      </h2>
    </div>
  );
}

/* ============================================================
   TopicPill
   ============================================================ */
function TopicPill({ label }: { label: TopicLabel }) {
  if (label === "STRONG") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {TOPIC_TEXT[label]}
      </span>
    );
  }
  if (label === "DEVELOPING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {TOPIC_TEXT[label]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      {TOPIC_TEXT[label]}
    </span>
  );
}