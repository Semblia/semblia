"use client";

import { cn } from "@/lib/utils";

interface SubmissionHeatmapProps {
  data: { day: number; hour: number; count: number }[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function SubmissionHeatmap({ data }: SubmissionHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const cellMap = new Map(data.map((d) => [`${d.day}-${d.hour}`, d.count]));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Submission activity
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Day × hour</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Hour labels */}
          <div className="flex items-center mb-1.5 ml-8">
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <div
                key={h}
                className="text-[9px] text-muted-foreground tabular-nums"
                style={{ width: `${(3 / 24) * 100}%` }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Grid */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center mb-0.5">
              <span className="text-[10px] text-muted-foreground w-8 shrink-0 font-medium">
                {day}
              </span>
              <div className="flex flex-1 gap-px">
                {HOURS.map((hour) => {
                  const count = cellMap.get(`${dayIdx}-${hour}`) ?? 0;
                  const intensity = count / maxCount;

                  return (
                    <div
                      key={hour}
                      title={`${day} ${formatHour(hour)}: ${count} submission${count !== 1 ? "s" : ""}`}
                      className={cn(
                        "flex-1 aspect-square rounded-[2px] transition-colors duration-200",
                        intensity === 0 && "bg-muted/40",
                      )}
                      style={
                        intensity > 0
                          ? {
                              background: `color-mix(in oklch, var(--color-brand) ${Math.round(intensity * 85 + 15)}%, transparent)`,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[9px] text-muted-foreground">Fewer</span>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                className="h-2.5 w-2.5 rounded-[2px]"
                style={
                  v === 0
                    ? { background: "var(--color-muted)" }
                    : {
                        background: `color-mix(in oklch, var(--color-brand) ${Math.round(v * 85 + 15)}%, transparent)`,
                      }
                }
              />
            ))}
            <span className="text-[9px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
