"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendRow, TrendSeries } from "@/lib/chart-data";

/* ============================================================
   AttemptDot — one dot per graded attempt.
   Filled for assigned, hollow for practice.
   ============================================================ */
function AttemptDot(props: {
  cx?: number;
  cy?: number;
  value?: unknown;
  stroke?: string;
  payload?: TrendRow;
}) {
  const { cx, cy, value, stroke, payload } = props;

  if (
    typeof value !== "number" ||
    typeof cx !== "number" ||
    typeof cy !== "number"
  ) {
    return null;
  }

  const assigned = payload?.assigned === true;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      stroke={stroke}
      strokeWidth={2}
      fill={assigned ? stroke : "#0a0a0a"}
    />
  );
}

export function ScoreTrendChart({
  rows,
  series,
  compact = false,
}: {
  rows: TrendRow[];
  series: TrendSeries[];
  compact?: boolean;
}) {
  /* ============ EMPTY STATE ============ */
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
        <p className="text-sm text-neutral-400">
          No graded attempts to chart yet.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Your score trend will appear here after your first released result.
        </p>
      </div>
    );
  }

  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <figure
      role="img"
      aria-label={`Score trend: ${rows.length} graded attempt${
        rows.length === 1 ? "" : "s"
      } from ${first.date} to ${last.date}. The table below lists every attempt.`}
      className="flex flex-col gap-3"
    >
      <div
        className={`w-full rounded-2xl border border-white/10 bg-white/[0.02] p-3 ${
          compact ? "h-56" : "h-72"
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            {/* Grid — subtle dashed lines, dark theme */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />

            {/* X axis */}
            <XAxis
              dataKey="n"
              type="number"
              domain={["dataMin", "dataMax"]}
              allowDecimals={false}
              ticks={
                rows.length <= 10 ? rows.map((r) => Number(r.n)) : undefined
              }
              tickFormatter={(n) =>
                String(rows[Number(n) - 1]?.date ?? "")
              }
              fontSize={11}
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: "#737373" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />

            {/* Y axis */}
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
              width={44}
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: "#737373" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />

            {/* Tooltip */}
            <Tooltip
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as TrendRow | undefined;
                return row
                  ? `${row.exam}, ${row.date} (${
                      row.assigned ? "assigned" : "practice"
                    })`
                  : "";
              }}
              formatter={(value, name) => [`${value}%`, String(name)]}
              contentStyle={{
                backgroundColor: "rgba(10,10,10,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.75rem",
                padding: "0.5rem 0.75rem",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
                fontSize: "0.75rem",
                color: "#e5e5e5",
              }}
              labelStyle={{
                color: "#a3a3a3",
                fontSize: "0.7rem",
                marginBottom: "0.25rem",
              }}
              itemStyle={{
                color: "#e5e5e5",
                fontSize: "0.75rem",
                padding: 0,
              }}
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
            />

            {/* Legend */}
            <Legend
              wrapperStyle={{
                fontSize: "0.75rem",
                color: "#a3a3a3",
                paddingTop: "0.5rem",
              }}
              iconType="plainline"
              iconSize={14}
            />

            {/* Series */}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={<AttemptDot />}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="grid h-3 w-3 place-items-center rounded-full border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
          </span>
          Filled dot — assigned exam
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="grid h-3 w-3 place-items-center rounded-full border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
          </span>
          Hollow dot — practice
        </span>
      </figcaption>
    </figure>
  );
}