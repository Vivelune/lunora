import type { SubjectSummary, TrendPoint } from "./analytics-core";

export const PALETTE = ["#111827", "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];

export type TrendRow = Record<string, string | number | boolean>;
export type TrendSeries = { key: string; name: string; color: string };

/** One row per attempt (oldest first). Each row carries a value only under its own subject's key. */
export function buildTrend(
  trend: TrendPoint[],
  subjects: { subjectId: string; subjectName: string }[]
): { rows: TrendRow[]; series: TrendSeries[] } {
  const series: TrendSeries[] = subjects.map((s, i) => ({
    key: `s_${s.subjectId}`,
    name: s.subjectName,
    color: PALETTE[i % PALETTE.length],
  }));

  const rows: TrendRow[] = trend.map((p, index) => ({
    n: index + 1,
    date: p.endedAt.toISOString().slice(0, 10),
    exam: p.examTitle,
    subjectName: p.subjectName,
    assigned: p.assigned,
    [`s_${p.subjectId}`]: p.percentHundredths / 100,
  }));

  return { rows, series };
}

export type BarRow = { subject: string; average: number; best: number; latest: number };

const percent = (earned: number, possible: number) => Math.round((earned * 10000) / possible) / 100;

/** Average, best and latest per subject, as percentages. Subjects with nothing to show are left out. */
export function buildSubjectBars(subjects: SubjectSummary[]): BarRow[] {
  return subjects.flatMap((s) => {
    const { averageHundredths, best, latest } = s.summary;
    if (averageHundredths === null || !best || !latest) return [];
    return [
      {
        subject: s.subjectName,
        average: averageHundredths / 100,
        best: percent(best.earnedHundredths, best.possibleHundredths),
        latest: percent(latest.earnedHundredths, latest.possibleHundredths),
      },
    ];
  });
}