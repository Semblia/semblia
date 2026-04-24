"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { useFormContext } from "./form-context";
import {
  inputStyle,
  inputFocusStyle,
  EMPTY_STYLE,
  FieldWrapper,
} from "./field-primitives";

/* ─── Radio ───────────────────────────────────────────────────────────────── */

export function RadioField({ q }: { q: StudioQuestion }) {
  const { values, setValue, isUnderline } = useFormContext();
  const selected = values[q.id] as string | undefined;
  const opts = q.options ?? [];

  return (
    <FieldWrapper q={q}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        role="radiogroup"
      >
        {opts.map((opt) => {
          const active = selected === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setValue(q.id, opt)}
              style={{
                ...inputStyle(isUnderline),
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: active
                  ? "var(--f-accent-08)"
                  : "var(--f-surface-60)",
                borderColor: active ? "var(--f-accent)" : "var(--f-line-50)",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  borderWidth: 1.5,
                  borderStyle: "solid",
                  borderColor: active
                    ? "var(--f-accent)"
                    : "var(--f-ink-soft-50)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "border-color .15s",
                }}
              >
                {active && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--f-accent)",
                    }}
                  />
                )}
              </span>
              <span
                style={{
                  fontFamily: "var(--f-font-body)",
                  fontSize: "var(--f-size-base)",
                  color: "var(--f-ink)",
                }}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

/* ─── Checkbox ────────────────────────────────────────────────────────────── */

export function CheckboxField({ q }: { q: StudioQuestion }) {
  const { values, setValue, isUnderline } = useFormContext();
  const selected: string[] = (values[q.id] as string[]) ?? [];
  const opts = q.options ?? [];

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    setValue(q.id, next);
  };

  return (
    <FieldWrapper q={q}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={checked}
              onClick={() => toggle(opt)}
              style={{
                ...inputStyle(isUnderline),
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: checked
                  ? "var(--f-accent-08)"
                  : "var(--f-surface-60)",
                borderColor: checked ? "var(--f-accent)" : "var(--f-line-50)",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderStyle: "solid",
                  borderColor: checked
                    ? "var(--f-accent)"
                    : "var(--f-ink-soft-50)",
                  backgroundColor: checked ? "var(--f-accent)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--f-accent-ink)",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: "all .15s",
                }}
              >
                {checked ? "✓" : ""}
              </span>
              <span
                style={{
                  fontFamily: "var(--f-font-body)",
                  fontSize: "var(--f-size-base)",
                  color: "var(--f-ink)",
                }}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

/* ─── Dropdown ────────────────────────────────────────────────────────────── */

export function DropdownField({ q }: { q: StudioQuestion }) {
  const { values, setValue, isUnderline: underline } = useFormContext();
  const [focused, setFocused] = React.useState(false);
  const value = (values[q.id] as string) ?? "";

  return (
    <FieldWrapper q={q}>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...inputStyle(underline),
            cursor: "pointer",
            appearance: "none",
            paddingRight: "calc(var(--f-field-pad) + 24px)",
            ...(focused ? inputFocusStyle(underline) : EMPTY_STYLE),
          }}
        >
          <option value="">Select…</option>
          {(q.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {/* Chevron icon */}
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "calc(var(--f-field-pad) + 2px)",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "var(--f-ink-soft)",
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </FieldWrapper>
  );
}

/* ─── File upload ─────────────────────────────────────────────────────────── */

export function FileUpload({ q }: { q: StudioQuestion }) {
  const { values, setValue } = useFormContext();
  const file = values[q.id] as File | null | undefined;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(q.id, e.target.files?.[0] ?? null);
  };

  return (
    <FieldWrapper q={q}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          ...inputStyle(false),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 90,
          borderStyle: "dashed" as const,
          color: "var(--f-ink-soft)",
          fontSize: "var(--f-size-sm)",
          gap: 6,
          cursor: "pointer",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L9 7m3-3l3 3" />
        </svg>
        <span>
          {file ? file.name : (q.placeholder ?? "Click or drop file here")}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label={q.label}
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </FieldWrapper>
  );
}
