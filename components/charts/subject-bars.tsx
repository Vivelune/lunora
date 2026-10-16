"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarRow } from "@/lib/chart-data";

const BAR_FILLS = {
  average: "#818cf8", // indigo-400
  best: "#34d399",    // emerald-400
  latest: "#fbbf24",  // amber-400
} as const;

export function SubjectBars({ rows }: { rows: BarRow[] }) {
  /* ============ EMPTY STATE ============ */
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
        <p className="text-sm text-neutral-400">
          No subject results to compare yet.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Compare subjects side by side once you have graded results in more
          than one.
        </p>
      </div>
    );
  }

  const description = rows
    .map(
      (r) =>
        `${r.subject}: average ${r.average}%, best ${r.best}%, latest ${r.latest}%`
    )
    .join("; ");

  return (
    <figure
      role="img"
      aria-label={`Subject comparison. ${description}.`}
      className="flex flex-col gap-3"
    >
      <div className="h-72 w-full rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            {/* Grid — horizontal only, subtle */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />

            {/* X axis */}
            <XAxis
              dataKey="subject"
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
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />

            {/* Legend */}
            <Legend
              wrapperStyle={{
                fontSize: "0.75rem",
                color: "#a3a3a3",
                paddingTop: "0.5rem",
              }}
              iconType="circle"
              iconSize={10}
            />

            {/* Bars */}
            <Bar
              dataKey="average"
              name="Average (points-weighted)"
              fill={BAR_FILLS.average}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="best"
              name="Best"
              fill={BAR_FILLS.best}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="latest"
              name="Latest"
              fill={BAR_FILLS.latest}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="text-xs leading-relaxed text-neutral-500">
        Average, best and latest are separate measures — average is
        points-weighted using the best attempt of each exam. Exact numbers are
        listed in each subject section below.
      </figcaption>
    </figure>
  );
}