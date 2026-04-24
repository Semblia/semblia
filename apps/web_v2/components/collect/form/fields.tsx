"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { useFormContext } from "./form-context";

/* ─── Shared field style objects (read CSS vars) ──────────────────────────── */

const baseField: React.CSSProperties = {
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

function inputStyle(underline: boolean): React.CSSProperties {
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

function inputFocusStyle(underline: boolean): React.CSSProperties {
  if (underline) {
    return { borderBottomColor: "var(--f-accent)", boxShadow: "none" };
  }
  return {
    borderColor: "var(--f-accent)",
    boxShadow: "0 0 0 3px var(--f-accent-08)",
  };
}

/* ─── Stable empty object — avoids re-allocation on every render ─────────── */

const EMPTY_STYLE: React.CSSProperties = {};

/* ─── Field label ─────────────────────────────────────────────────────────── */

function FieldLabel({ label, required }: { label: string; required: boolean }) {
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

function FieldError({ error }: { error: string }) {
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

function FieldWrapper({
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

/* ─── Short text ──────────────────────────────────────────────────────────── */

function ShortTextField({ q }: { q: StudioQuestion }) {
  const { values, setValue, isUnderline: underline } = useFormContext();
  const [focused, setFocused] = React.useState(false);
  const value = (values[q.id] as string) ?? "";

  return (
    <FieldWrapper q={q}>
      <input
        type="text"
        value={value}
        placeholder={q.placeholder ?? "Type here…"}
        onChange={(e) => setValue(q.id, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle(underline),
          ...(focused ? inputFocusStyle(underline) : EMPTY_STYLE),
        }}
      />
    </FieldWrapper>
  );
}

/* ─── Long text ───────────────────────────────────────────────────────────── */

function LongTextField({ q }: { q: StudioQuestion }) {
  const { values, setValue, isUnderline: underline } = useFormContext();
  const [focused, setFocused] = React.useState(false);
  const value = (values[q.id] as string) ?? "";

  return (
    <FieldWrapper q={q}>
      <textarea
        rows={4}
        value={value}
        placeholder={q.placeholder ?? "Share your thoughts…"}
        onChange={(e) => setValue(q.id, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle(underline),
          resize: "none",
          minHeight: "calc(var(--f-size-base) * 6)",
          ...(focused ? inputFocusStyle(underline) : EMPTY_STYLE),
        }}
      />
    </FieldWrapper>
  );
}

/* ─── Star rating ─────────────────────────────────────────────────────────── */

function StarRating({ q }: { q: StudioQuestion }) {
  const { values, setValue } = useFormContext();
  const selected = (values[q.id] as number) ?? -1;
  const [hovered, setHovered] = React.useState(-1);

  return (
    <FieldWrapper q={q}>
      <div
        style={{ display: "flex", gap: 6 }}
        role="group"
        aria-label={q.label}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const active = i <= (hovered >= 0 ? hovered : selected);
          return (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} star${i > 0 ? "s" : ""}`}
              aria-pressed={i === selected}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(-1)}
              onClick={() => setValue(q.id, i)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
                transform: active ? "scale(1.15)" : "scale(1)",
                transition: "transform .15s",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  display: "block",
                  width: "calc(var(--f-size-base) * 1.7)",
                  height: "calc(var(--f-size-base) * 1.7)",
                }}
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"
                  fill={active ? "var(--f-accent)" : "none"}
                  stroke={active ? "var(--f-accent)" : "var(--f-ink-soft-30)"}
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

/* ─── NPS ─────────────────────────────────────────────────────────────────── */

function NpsField({ q }: { q: StudioQuestion }) {
  const { values, setValue } = useFormContext();
  const selected = values[q.id] as number | null | undefined;

  return (
    <FieldWrapper q={q}>
      <div
        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
        role="group"
        aria-label={q.label}
      >
        {Array.from({ length: 11 }, (_, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Score ${i}`}
              aria-pressed={active}
              onClick={() => setValue(q.id, i)}
              style={{
                width: "calc(var(--f-size-base) * 2.25)",
                height: "calc(var(--f-size-base) * 2.25)",
                borderRadius: "var(--f-field-radius)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: active ? "var(--f-accent)" : "var(--f-line-50)",
                backgroundColor: active ? "var(--f-accent)" : "transparent",
                color: active ? "var(--f-accent-ink)" : "var(--f-ink)",
                fontFamily: "var(--f-font-mono)",
                fontSize: "var(--f-size-sm)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "var(--f-size-xs)",
          color: "var(--f-ink-soft)",
          marginTop: 4,
          fontFamily: "var(--f-font-body)",
        }}
      >
        <span>Not likely</span>
        <span>Extremely likely</span>
      </div>
    </FieldWrapper>
  );
}

/* ─── Emoji scale ─────────────────────────────────────────────────────────── */

const EMOJIS = ["😫", "😕", "😐", "🙂", "🤩"] as const;
const EMOJI_LABELS = ["Awful", "Bad", "Meh", "Good", "Great"] as const;

function EmojiScale({ q }: { q: StudioQuestion }) {
  const { values, setValue } = useFormContext();
  const selected = values[q.id] as number | null | undefined;

  return (
    <FieldWrapper q={q}>
      <div
        style={{ display: "flex", gap: 8, justifyContent: "center" }}
        role="group"
        aria-label={q.label}
      >
        {EMOJIS.map((e, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={EMOJI_LABELS[i]}
              aria-pressed={active}
              onClick={() => setValue(q.id, i)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                fontSize: "calc(var(--f-size-base) * 2)",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: selected == null || active ? 1 : 0.35,
                transform: active ? "scale(1.18)" : "scale(1)",
                transition: "all .15s",
                padding: "4px 0",
                lineHeight: 1,
              }}
            >
              {e}
              <span
                style={{
                  fontSize: "var(--f-size-xs)",
                  fontFamily: "var(--f-font-body)",
                  color: "var(--f-ink-soft)",
                  fontWeight: 500,
                }}
              >
                {EMOJI_LABELS[i]}
              </span>
            </button>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

/* ─── Radio ───────────────────────────────────────────────────────────────── */

function RadioField({ q }: { q: StudioQuestion }) {
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

function CheckboxField({ q }: { q: StudioQuestion }) {
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

function DropdownField({ q }: { q: StudioQuestion }) {
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

function FileUpload({ q }: { q: StudioQuestion }) {
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

/* ─── Field dispatcher ────────────────────────────────────────────────────── */

export const Field = React.memo(function Field({
  question,
}: {
  question: StudioQuestion;
}) {
  switch (question.type) {
    case "shorttext":
      return <ShortTextField q={question} />;
    case "longtext":
      return <LongTextField q={question} />;
    case "stars":
      return <StarRating q={question} />;
    case "nps":
      return <NpsField q={question} />;
    case "emoji":
      return <EmojiScale q={question} />;
    case "radio":
      return <RadioField q={question} />;
    case "checkbox":
      return <CheckboxField q={question} />;
    case "dropdown":
      return <DropdownField q={question} />;
    case "file":
      return <FileUpload q={question} />;
    default:
      return null;
  }
});
