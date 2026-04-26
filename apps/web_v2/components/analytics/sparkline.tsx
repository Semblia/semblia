"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  series: number[];
  color?: string;
  className?: string;
  height?: number;
}

export function Sparkline({
  series,
  color = "var(--color-brand)",
  className,
  height = 32,
}: SparklineProps) {
  const data = series.map((value, i) => ({ i, value }));

  return (
    <div
      className={cn("w-full animate-in fade-in duration-300", className)}
      style={{ height }}
      aria-hidden="true"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient
              id={`spark-grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-grad-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
