import type { Summary } from "@/lib/analytics-core";
import { formatHundredths } from "@/lib/points";

const day = (d: Date) => d.toISOString().slice(0, 10);
const pct = (hundredths: number | null) =>
  hundredths === null ? "—" : `${formatHundredths(hundredths)}%`;
const ratio = (earned: number, possible: number) =>
  Math.round(possible > 0 ? (earned * 10000) / possible : 0);

export function PerformanceMetrics({ summary }: { summary: Summary }) {
  const { latest, best } = summary;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* ============ LATEST SCORE ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
        <div
          aria-hidden
          className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-20 blur-2xl"
        />

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          Latest score
        </p>

        <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums">
          {latest
            ? pct(ratio(latest.earnedHundredths, latest.possibleHundredths))
            : "—"}
        </p>

        {latest && (
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            {latest.examTitle} ·{" "}
            <span className="tabular-nums">{day(latest.endedAt)}</span>
          </p>
        )}
      </div>

      {/* ============ BEST SCORE ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
        <div
          aria-hidden
          className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 opacity-20 blur-2xl"
        />

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          Best score
        </p>

        <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums">
          {best
            ? pct(ratio(best.earnedHundredths, best.possibleHundredths))
            : "—"}
        </p>

        {best && (
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            {best.examTitle} ·{" "}
            <span className="tabular-nums">{day(best.endedAt)}</span>
          </p>
        )}
      </div>

      {/* ============ AVERAGE ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
        <div
          aria-hidden
          className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 opacity-20 blur-2xl"
        />

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          Average (points-weighted)
        </p>

        <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums">
          {pct(summary.averageHundredths)}
        </p>

        {summary.averageHundredths !== null && (
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            <span className="tabular-nums">
              {formatHundredths(summary.weightedEarned)}
            </span>{" "}
            of{" "}
            <span className="tabular-nums">
              {formatHundredths(summary.weightedPossible)}
            </span>{" "}
            points, best attempt of each exam
          </p>
        )}
      </div>

      {/* ============ EXAMS COMPLETED ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
        <div
          aria-hidden
          className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-600 opacity-20 blur-2xl"
        />

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
          Exams completed
        </p>

        <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums">
          {summary.examsCompleted}
        </p>

        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
          <span className="tabular-nums">{summary.attempts}</span> attempt
          {summary.attempts === 1 ? "" : "s"} (
          <span className="tabular-nums">{summary.assignedAttempts}</span>{" "}
          assigned,{" "}
          <span className="tabular-nums">{summary.practiceAttempts}</span>{" "}
          practice)
        </p>
      </div>
    </div>
  );
}