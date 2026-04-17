"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export type DeviceSize = "mobile" | "tablet" | "desktop" | "fill";

export const DEVICE_SIZES: Record<DeviceSize, { w: number; h: number; label: string }> = {
  mobile: { w: 375, h: 812, label: "Mobile · 375×812" },
  tablet: { w: 768, h: 1024, label: "Tablet · 768×1024" },
  desktop: { w: 1280, h: 800, label: "Desktop · 1280×800" },
  fill: { w: 0, h: 0, label: "Fill" },
};

const frameSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

export function DeviceFrame({
  device,
  children,
  showChrome = true,
  className,
}: {
  device: DeviceSize;
  children: React.ReactNode;
  showChrome?: boolean;
  className?: string;
}) {
  const size = DEVICE_SIZES[device];
  const isFill = device === "fill";

  return (
    <motion.div
      data-slot="device-frame"
      data-device={device}
      className={cn(
        "relative flex flex-col overflow-hidden border border-border bg-background shadow-xl shadow-black/5",
        isFill ? "size-full rounded-none" : "rounded-2xl",
        className
      )}
      layout
      transition={frameSpring}
      style={
        isFill
          ? undefined
          : {
              height: "100%",
              maxHeight: `${size.h}px`,
              maxWidth: "100%",
              aspectRatio: `${size.w} / ${size.h}`,
            }
      }
    >
      <AnimatePresence>
        {showChrome && !isFill && (
          <motion.div
            key="chrome"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex shrink-0 items-center gap-1.5 border-b border-border/70 bg-muted/40 px-3 py-2"
          >
            <span className="inline-block size-2 rounded-full bg-red-400/70" />
            <span className="inline-block size-2 rounded-full bg-amber-400/70" />
            <span className="inline-block size-2 rounded-full bg-emerald-400/70" />
            <span className="ml-2 truncate text-[10px] font-medium text-muted-foreground">
              {size.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative flex-1 overflow-auto">{children}</div>
    </motion.div>
  );
}
