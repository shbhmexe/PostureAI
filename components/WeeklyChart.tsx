"use client";

import type { DailyScore } from "@/types/posture";

type Props = {
  data: DailyScore[];
};

export default function WeeklyChart({ data }: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Weekly posture score</p>
          <p className="text-lg font-semibold text-slate-100">
            {data.length ? "Last 7 days" : "No data yet"}
          </p>
        </div>
        <span className="text-xs text-slate-500">Avg</span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-2">
        {data.map((item) => {
          const hasScore = item.score !== null;
          const score = item.score ?? 0;
          const height = hasScore ? Math.max(8, score) : 6;

          return (
            <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end">
                <div
                  className={`w-full rounded-full ${
                    !hasScore
                      ? "bg-slate-800"
                      : score > 80
                        ? "bg-emerald-500/80"
                        : score > 60
                          ? "bg-amber-500/80"
                          : "bg-rose-500/80"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {formatDay(item.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date);
}
