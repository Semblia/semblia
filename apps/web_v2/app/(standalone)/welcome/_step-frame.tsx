"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StepFrameProps {
  /** Two-digit ordinal, e.g. "01". */
  ordinal: string;
  /** Section title — displayed as the editorial heading. */
  title: string | React.ReactNode;
  /** Sub-line below the heading. */
  description?: string | React.ReactNode;
  /** Optional kicker shown above the heading instead of the default ordinal. */
  kicker?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Common header + body frame for the onboarding right pane.
 *
 * Each step is wrapped in this so the kicker, heading, and supporting copy
 * stay typographically consistent.
 */
export function StepFrame({
  ordinal,
  title,
  description,
  kicker,
  children,
  className,
}: StepFrameProps) {
  return (
    <div className={cn("w-full", className)}>
      <header className="mb-8">
        <p className="text-xs font-medium text-muted-foreground">
          {kicker ?? `Step ${ordinal}`}
        </p>

        <h1 className="mt-3.5 text-[1.65rem] leading-[1.12] font-semibold tracking-[-0.022em] text-foreground sm:text-[1.8rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>

      {children}
    </div>
  );
}

// ── Shared skip control used across every step ──────────────────────────────

interface SkipButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function StepSkipButton({
  onClick,
  label = "Skip this step",
  disabled,
}: SkipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 w-full py-1 text-center text-[12.5px] text-muted-foreground/80 transition-colors duration-150 hover:text-foreground disabled:opacity-50"
    >
      {label}
    </button>
  );
}
