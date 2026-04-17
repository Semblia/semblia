"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export type DeviceSize = "mobile" | "tablet" | "desktop" | "fill";

export const DEVICE_SIZES: Record<
  DeviceSize,
  { w: number; h: number; label: string }
> = {
  mobile: { w: 393, h: 852, label: "iPhone 16 · 393×852" },
  tablet: { w: 768, h: 1024, label: "Tablet · 768×1024" },
  desktop: { w: 1280, h: 800, label: "Desktop · 1280×800" },
  fill: { w: 0, h: 0, label: "Fill" }
};

const frameSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ------------------------------------------------------------------ */
/*  Per-device chrome components                                      */
/* ------------------------------------------------------------------ */

/** Desktop — browser window with traffic lights + address bar */
function DesktopChrome({ label }: { label: string }) {
  return (
    <motion.div
      key="chrome-desktop"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-muted/35 px-4 py-2"
    >
      <div className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full bg-rose-400/80" />
        <span className="size-[9px] rounded-full bg-amber-400/80" />
        <span className="size-[9px] rounded-full bg-emerald-400/80" />
      </div>
      <div className="flex h-6 flex-1 items-center justify-center rounded-md border border-border/60 bg-background/80 px-3">
        <span className="truncate text-[10px] text-muted-foreground">
          yourapp.com/collect/your-project
        </span>
      </div>
      <span className="hidden shrink-0 text-[9px] text-muted-foreground/50 lg:inline">
        {label}
      </span>
    </motion.div>
  );
}

/** Mobile — dynamic island notch at top, home indicator at bottom */
function MobileChrome() {
  return (
    <>
      {/* Dynamic island */}
      <div className="pointer-events-none absolute left-1/2 top-[10px] z-20 -translate-x-1/2">
        <div className="h-[28px] w-[100px] rounded-full bg-black">
          {/* Front camera */}
          <div className="absolute right-[14px] top-1/2 size-[8px] -translate-y-1/2 rounded-full bg-zinc-800 ring-1 ring-zinc-700/60" />
        </div>
      </div>
      {/* Home indicator */}
      <div className="pointer-events-none absolute bottom-[8px] left-1/2 z-20 -translate-x-1/2">
        <div className="h-[5px] w-[120px] rounded-full bg-foreground/20" />
      </div>
    </>
  );
}

/** Tablet — camera dot at top center, home indicator at bottom */
function TabletChrome() {
  return (
    <>
      {/* Camera dot */}
      <div className="pointer-events-none absolute left-1/2 top-[8px] z-20 -translate-x-1/2">
        <div className="size-[6px] rounded-full bg-zinc-700/40 ring-1 ring-zinc-600/20 dark:bg-zinc-400/30" />
      </div>
      {/* Home indicator */}
      <div className="pointer-events-none absolute bottom-[6px] left-1/2 z-20 -translate-x-1/2">
        <div className="h-[4px] w-[80px] rounded-full bg-foreground/15" />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DeviceFrame                                                  */
/* ------------------------------------------------------------------ */

export function DeviceFrame({
  device,
  children,
  showChrome = true,
  className
}: {
  device: DeviceSize;
  children: React.ReactNode;
  showChrome?: boolean;
  className?: string;
}) {
  const size = DEVICE_SIZES[device];
  const isFill = device === "fill";
  const isMobile = device === "mobile";
  const isTablet = device === "tablet";
  const isDesktop = device === "desktop";

  /* Device-specific outer styling */
  const outerRadius = isMobile
    ? "rounded-[40px]"
    : isTablet
      ? "rounded-[28px]"
      : isDesktop
        ? "rounded-lg"
        : "rounded-none";

  const bezelPadding = isMobile ? "p-[10px]" : isTablet ? "p-[6px]" : "";

  const bezelBg =
    isMobile || isTablet ? "bg-zinc-900 dark:bg-zinc-950" : "bg-background";

  const bezelBorder =
    isMobile || isTablet
      ? "border-zinc-700/50 dark:border-zinc-600/30"
      : "border-border";

  /* Inner screen radius (slightly smaller than outer) */
  const screenRadius = isMobile
    ? "rounded-[34px]"
    : isTablet
      ? "rounded-[22px]"
      : isDesktop
        ? "rounded-b-md"
        : "";

  /* Content padding for mobile/tablet to clear notch + home bar */
  const screenPadding = isMobile
    ? "pt-[38px] pb-[26px]"
    : isTablet
      ? "pt-[22px] pb-[18px]"
      : "";

  return (
    <motion.div
      data-slot="device-frame"
      data-device={device}
      className={cn(
        "relative flex flex-col overflow-hidden border shadow-xl shadow-black/8",
        outerRadius,
        bezelBg,
        bezelBorder,
        bezelPadding,
        isFill && "size-full",
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
              aspectRatio: `${size.w} / ${size.h}`
            }
      }
    >
      {/* Desktop browser chrome */}
      <AnimatePresence>
        {showChrome && isDesktop && <DesktopChrome label={size.label} />}
      </AnimatePresence>

      {/* Mobile/Tablet overlaid chrome elements */}
      {showChrome && isMobile && <MobileChrome />}
      {showChrome && isTablet && <TabletChrome />}

      {/* Screen / content area */}
      <div
        className={cn(
          "relative flex-1 overflow-auto",
          screenRadius,
          screenPadding,
          (isMobile || isTablet) &&
            "bg-background border border-white/[0.06] scrollbar-none"
        )}
        style={isMobile || isTablet ? { scrollbarWidth: "none" } : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
}
