"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";

/* ─── Shared types ────────────────────────────────────────────────────────── */

export interface FlowProps {
  questions: StudioQuestion[]; // already filtered by showIf + sorted
  stickyProgress?: boolean;
}

/* ─── Progress bar ────────────────────────────────────────────────────────── */

export function ProgressBar({
  current,
  total,
  sticky,
}: {
  current: number;
  total: number;
  sticky?: boolean;
}) {
  const pct = total > 0 ? Math.min(((current + 1) / total) * 100, 100) : 0;
  return (
    <div
      style={
        sticky
          ? {
              position: "sticky",
              top: 0,
              zIndex: 10,
              marginBottom: "var(--f-flow-gap)",
              paddingTop: 4,
              background: "var(--f-sticky-bg, var(--f-bg))",
            }
          : { marginBottom: "var(--f-flow-gap)" }
      }
    >
      <div
        style={{
          height: 3,
          background: "var(--f-line-30)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--f-accent)",
            borderRadius: 999,
            transition: "width .35s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Nav button ──────────────────────────────────────────────────────────── */

export function NavBtn({
  onClick,
  disabled,
  children,
  secondary,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--f-font-body)",
        fontSize: "var(--f-size-sm)",
        fontWeight: secondary ? 400 : 600,
        color: secondary
          ? disabled
            ? "var(--f-ink-soft-30)"
            : "var(--f-ink-soft)"
          : "var(--f-accent)",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: "var(--f-label-gap) 0",
        opacity: disabled ? 0.4 : 1,
        transition: "opacity .15s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Auto-advance question types ─────────────────────────────────────────── */

export const AUTO_ADVANCE_TYPES: StudioQuestion["type"][] = [
  "stars",
  "nps",
  "emoji",
  "radio",
  "dropdown",
];
