"use client";

import * as React from "react";
import { useStudioStore } from "@/lib/collect/studio-store";
import { evaluateDesignHealth, type DesignIssue } from "@/lib/collect/design-health";
import type { StudioConfig } from "@/lib/collect/studio-types";

/* ─── Per-session dismissed set ──────────────────────────────────────────── */

const dismissedIds = new Set<string>();

/* ─── Single issue row ────────────────────────────────────────────────────── */

function IssueRow({
  issue,
  onFix,
  onDismiss,
}: {
  issue: DesignIssue;
  onFix?: () => void;
  onDismiss: () => void;
}) {
  const isWarn = issue.severity === "warn";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "6px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontSize: 13,
          marginTop: 1,
        }}
        aria-hidden="true"
      >
        {isWarn ? "⚠" : "ℹ"}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 11.5,
          lineHeight: 1.5,
          fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
          color: isWarn ? "#fde68a" : "#d1d5db",
          letterSpacing: "0.01em",
        }}
      >
        {issue.message}
      </span>
      <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 1 }}>
        {onFix && (
          <button
            type="button"
            onClick={onFix}
            style={{
              fontSize: 10,
              fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
              letterSpacing: "0.05em",
              padding: "2px 7px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "#f3f4f6",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Fix
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            fontSize: 12,
            lineHeight: 1,
            padding: "2px 5px",
            borderRadius: 4,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ─── Banner ──────────────────────────────────────────────────────────────── */

export const DesignHealthBanner = React.memo(function DesignHealthBanner({
  formId,
}: {
  formId: string;
}) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const setTokens = useStudioStore((s) => s.setTokens);
  const updateLayout = useStudioStore((s) => s.updateLayout);

  // Force re-render on dismiss
  const [, bump] = React.useReducer((x: number) => x + 1, 0);

  const issues = React.useMemo(
    () => (draft ? evaluateDesignHealth(draft) : []),
    [draft],
  );

  const visible = issues.filter((i) => !dismissedIds.has(i.id));
  const warnCount = visible.filter((i) => i.severity === "warn").length;

  if (visible.length === 0) return null;

  const applyFix = (issue: DesignIssue, currentDraft: StudioConfig) => {
    if (!issue.canonicalFix) return;
    const next = issue.canonicalFix(currentDraft);
    // Apply tokens and layout deltas independently so store actions fire correctly
    if (next.tokens !== currentDraft.tokens) {
      setTokens(formId, next.tokens);
    }
    if (next.layout !== currentDraft.layout) {
      updateLayout(formId, next.layout);
    }
    dismissedIds.add(issue.id);
    bump();
  };

  const dismiss = (id: string) => {
    dismissedIds.add(id);
    bump();
  };

  return (
    <div
      style={{
        background: "rgba(15, 15, 18, 0.82)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "8px 16px",
      }}
      role="status"
      aria-label={`${warnCount} design ${warnCount === 1 ? "warning" : "warnings"}`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: visible.length > 0 ? 4 : 0,
          fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
          fontSize: 10,
          letterSpacing: "0.07em",
          color: warnCount > 0 ? "#fbbf24" : "#9ca3af",
          textTransform: "uppercase",
        }}
      >
        <span style={{ userSelect: "none" }}>
          {warnCount > 0 ? `${warnCount} design ${warnCount === 1 ? "warning" : "warnings"}` : "Design notes"}
        </span>
      </div>
      {draft &&
        visible.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            onFix={
              issue.canonicalFix
                ? () => applyFix(issue, draft)
                : undefined
            }
            onDismiss={() => dismiss(issue.id)}
          />
        ))}
    </div>
  );
});
