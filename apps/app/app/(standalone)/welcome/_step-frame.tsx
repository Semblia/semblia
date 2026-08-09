"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StepFrameProps {
  /** Section title — displayed as the heading. */
  title: string | React.ReactNode;
  /** Sub-line below the heading. */
  description?: string | React.ReactNode;
  /** Optional small kicker shown above the heading (e.g. "You're live"). */
  kicker?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Common header + body frame for each onboarding step. The progress strip in
 * the shell carries the step number, so the header stays to a calm heading +
 * supporting line (no ordinal eyebrow).
 */
export function StepFrame({
  title,
  description,
  kicker,
  children,
  className,
}: StepFrameProps) {
  return (
    <div className={cn("w-full", className)}>
      <header className="mb-7">
        {kicker && (
          <p className="mb-2 text-[12.5px] font-medium text-brand">{kicker}</p>
        )}

        <h1 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-muted-foreground">
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
