"use client";

import { cn } from "@/lib/utils";
import type { WatermarkPosition } from "@/lib/collect/types";

export function Watermark({
  position,
  className,
}: {
  position: WatermarkPosition;
  className?: string;
}) {
  return (
    <div
      data-slot="watermark"
      className={cn(
        "pointer-events-none absolute z-10 flex items-center gap-1 rounded-full border border-black/5 bg-white/85 px-2 py-1 text-[9px] font-medium text-slate-600 shadow-sm backdrop-blur",
        position === "bottom-left" && "bottom-3 left-3",
        position === "bottom-right" && "bottom-3 right-3",
        position === "bottom-center" && "bottom-3 left-1/2 -translate-x-1/2",
        className,
      )}
    >
      <span className="inline-block size-1.5 rounded-full bg-amber-500" />
      <span>Powered by Semblia</span>
    </div>
  );
}
