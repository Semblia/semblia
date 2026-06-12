"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { SembliaWordmark } from "@/components/brand/semblia-mark";
import { cn } from "@/lib/utils";
import { ONBOARD_STEPS, type OnboardStep } from "./steps/constants";

interface StepRailProps {
  current: OnboardStep;
  /** Called when the user clicks a completed step to navigate back to it. */
  onStepClick?: (step: OnboardStep) => void;
}

/**
 * Dark editorial brand rail — left pane of the onboarding shell.
 *
 * Always renders in dark-mode token context (parent aside carries `.dark`).
 * Columns: brand wordmark → headline → step list → customer quote.
 */
export function StepRail({ current, onStepClick }: StepRailProps) {
  const currentIndex = ONBOARD_STEPS.findIndex((s) => s.id === current);
  const progress = currentIndex / Math.max(ONBOARD_STEPS.length - 1, 1);

  return (
    <div className="relative flex h-full flex-col overflow-hidden px-10 py-10 lg:px-12">
      {/* Depth fade from bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-52"
        style={{
          background:
            "linear-gradient(to top, oklch(0.08 0.01 60) 0%, transparent 100%)",
        }}
      />

      {/* ── Wordmark ── */}
      <div className="relative z-10 auth-stagger-1">
        <SembliaWordmark />
      </div>

      {/* ── Counter + step list — vertically centred in remaining space ── */}
      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-foreground/30 uppercase select-none auth-stagger-2">
          Setup · {String(currentIndex + 1).padStart(2, "0")} of{" "}
          {String(ONBOARD_STEPS.length).padStart(2, "0")}
        </p>

        {/* ── Step list ── */}
        <ol className="relative z-10 mt-6 auth-stagger-3">
          {/* Spine */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-3 bottom-3 left-[9px] w-px bg-foreground/8"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-3 left-[9px] w-px bg-foreground/25 transition-[height] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              height: `calc(${progress * 100}% - 6px)`,
            }}
          />

          {ONBOARD_STEPS.map((step) => {
            const isDone = step.index < currentIndex;
            const isActive = step.index === currentIndex;
            const isClickable = isDone && !!onStepClick;
            return (
              <li key={step.id}>
                <div
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={isClickable ? () => onStepClick(step.id) : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) =>
                          (e.key === "Enter" || e.key === " ") &&
                          onStepClick(step.id)
                      : undefined
                  }
                  className={cn(
                    "flex items-start gap-4 py-2.5",
                    isClickable &&
                      "-mx-2 cursor-pointer rounded-md px-2 transition-colors duration-150 hover:bg-foreground/5",
                  )}
                >
                  {/* Node */}
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                      isActive &&
                        "border-brand bg-brand text-[oklch(0.12_0.01_60)]",
                      isDone &&
                        "border-foreground/25 bg-[oklch(0.185_0.01_60)] text-foreground/50",
                      !isActive &&
                        !isDone &&
                        "border-foreground/10 bg-transparent text-foreground/15",
                    )}
                    aria-hidden
                  >
                    {isDone ? (
                      <CheckIcon className="size-2.5" weight="bold" />
                    ) : (
                      <span className="font-mono text-[8.5px] font-semibold tabular-nums">
                        {step.ordinal}
                      </span>
                    )}
                  </span>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[12.5px] font-medium leading-tight tracking-[-0.005em] transition-colors duration-200",
                        isActive
                          ? "text-foreground"
                          : isDone
                            ? "text-foreground/40"
                            : "text-foreground/18",
                      )}
                    >
                      {step.title}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] leading-relaxed transition-[colors,opacity] duration-200",
                        isActive ? "text-muted-foreground" : "text-transparent",
                      )}
                    >
                      {step.caption}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
