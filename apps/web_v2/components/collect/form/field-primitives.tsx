"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { useFormContext } from "./form-context";

/* ─── Shared field style objects (read CSS vars) ──────────────────────────── */

export const baseField: React.CSSProperties = {
  fontFamily: "var(--f-font-body)",
  fontSize: "var(--f-size-base)",
  fontWeight: "var(--f-weight-body)" as React.CSSProperties["fontWeight"],
  color: "var(--f-ink)",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color .2s, box-shadow .2s, background .2s",
  display: "block",
};

export function inputStyle(underline: boolean): React.CSSProperties {
  if (underline) {
    return {
      ...baseField,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderStyle: "none",
      borderColor: "transparent",
      borderBottomWidth: 1.5,
      borderBottomStyle: "solid",
      borderBottomColor: "var(--f-line-50)",
      borderRadius: 0,
      padding: "var(--f-field-pad) 0",
    };
  }
  return {
    ...baseField,
    backgroundColor: "var(--f-surface-60)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--f-line-50)",
    borderRadius: "var(--f-field-radius)",
    padding: "var(--f-field-pad) calc(var(--f-field-pad) + 4px)",
  };
}

export function inputFocusStyle(underline: boolean): React.CSSProperties {
  if (underline) {
    return { borderBottomColor: "var(--f-accent)", boxShadow: "none" };
  }
  return {
    borderColor: "var(--f-accent)",
    boxShadow: "0 0 0 3px var(--f-accent-08)",
  };
}

/* ─── Stable empty object — avoids re-allocation on every render ─────────── */

export const EMPTY_STYLE: React.CSSProperties = {};

/* ─── Field label ─────────────────────────────────────────────────────────── */

export function FieldLabel({
  label,
  required,
}: {
  label: string;
  required: boolean;
}) {
  return (
    <label
      style={{
        fontFamily: "var(--f-font-body)",
        fontSize: "var(--f-size-sm)",
        fontWeight: 500,
        color: "var(--f-ink)",
        marginBottom: "var(--f-label-gap)",
        display: "block",
      }}
    >
      {label}
      {required && (
        <svg
          viewBox="0 0 8 8"
          width="7"
          height="7"
          aria-hidden="true"
          style={{ marginLeft: 4, verticalAlign: "super" }}
        >
          <path
            d="M4 0l1 2.5L8 3l-2 2 .5 3L4 6.5 1.5 8l.5-3-2-2 3-.5z"
            fill="var(--f-accent)"
          />
        </svg>
      )}
    </label>
  );
}

/* ─── Error message ───────────────────────────────────────────────────────── */

export function FieldError({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      style={{
        fontFamily: "var(--f-font-body)",
        fontSize: "var(--f-size-xs)",
        color: "var(--f-error-color, #ef4444)",
        marginTop: 4,
        margin: "4px 0 0",
      }}
    >
      {error}
    </p>
  );
}

/* ─── Field wrapper ───────────────────────────────────────────────────────── */

export function FieldWrapper({
  q,
  children,
}: {
  q: StudioQuestion;
  children: React.ReactNode;
}) {
  const { errors } = useFormContext();
  const error = errors[q.id] ?? "";

  return (
    <div>
      <FieldLabel label={q.label} required={q.required} />
      {children}
      <FieldError error={error} />
    </div>
  );
}
