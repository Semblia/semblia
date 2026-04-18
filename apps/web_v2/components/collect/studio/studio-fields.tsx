"use client";

/**
 * Studio field components — token-driven form fields for the preview.
 * Each field renders with the form's design tokens for live theming.
 */

import * as React from "react";
import type { DesignTokens, StudioQuestion } from "@/lib/collect/studio-types";

/* ─── Token-derived style helpers ─────────────────────────────────────────── */

function hexAlpha(hex: string, alpha: number) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function fieldBaseStyle(t: DesignTokens): React.CSSProperties {
  const densityPad =
    t.density === "compact" ? 8 : t.density === "cozy" ? 14 : t.density === "airy" ? 18 : 11;
  const r =
    t.fieldShape === "pill" ? 999 : t.fieldShape === "square" ? 0 : t.radius;

  const base: React.CSSProperties = {
    fontFamily: t.fontBody,
    fontSize: t.sizeBase,
    fontWeight: t.weightBody,
    color: t.ink,
    backgroundColor: hexAlpha(t.surface, 0.6),
    padding: `${densityPad}px ${densityPad + 4}px`,
    borderRadius: r,
    border: "none",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color .2s, box-shadow .2s",
  };

  if (t.fieldShape === "underline") {
    base.backgroundColor = "transparent";
    base.borderBottom = `1.5px solid ${hexAlpha(t.line, 0.7)}`;
    base.borderRadius = 0;
    base.paddingLeft = 0;
    base.paddingRight = 0;
  } else {
    base.border = `1px solid ${hexAlpha(t.line, 0.5)}`;
  }

  return base;
}

function labelStyle(t: DesignTokens): React.CSSProperties {
  return {
    fontFamily: t.fontBody,
    fontSize: t.sizeBase * 0.85,
    fontWeight: 500,
    color: t.ink,
    marginBottom: 6,
    display: "block",
  };
}

/* ─── Field label ─────────────────────────────────────────────────────────── */

function FieldLabel({ label, required, tokens }: { label: string; required: boolean; tokens: DesignTokens }) {
  return (
    <label style={labelStyle(tokens)}>
      {label}
      {required && (
        <span style={{ color: tokens.accent, marginLeft: 3, fontWeight: 600 }}>*</span>
      )}
    </label>
  );
}

/* ─── Individual fields ───────────────────────────────────────────────────── */

function ShortTextField({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <input
        type="text"
        readOnly
        placeholder={q.placeholder ?? "Type here..."}
        style={fieldBaseStyle(tokens)}
      />
    </div>
  );
}

function LongTextField({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <textarea
        readOnly
        rows={3}
        placeholder={q.placeholder ?? "Share your thoughts..."}
        style={{
          ...fieldBaseStyle(tokens),
          resize: "none" as const,
          minHeight: 80,
        }}
      />
    </div>
  );
}

function StarRating({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  const [hovered, setHovered] = React.useState(-1);
  const [selected, setSelected] = React.useState(-1);
  const starSize = tokens.sizeBase * 1.8;

  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <div style={{ display: "flex", gap: 4 }} role="group" aria-label={q.label}>
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
              onClick={() => setSelected(i)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: starSize,
                color: active ? tokens.accent : hexAlpha(tokens.inkSoft, 0.3),
                transition: "color .15s, transform .15s",
                transform: active ? "scale(1.12)" : "scale(1)",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NpsField({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  const [selected, setSelected] = React.useState<number | null>(null);

  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }} role="group" aria-label={q.label}>
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Score ${i}`}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
            style={{
              width: 32,
              height: 32,
              borderRadius: tokens.radius,
              border: `1px solid ${selected === i ? tokens.accent : hexAlpha(tokens.line, 0.5)}`,
              backgroundColor: selected === i ? tokens.accent : "transparent",
              color: selected === i ? tokens.accentInk : tokens.ink,
              fontFamily: tokens.fontMono,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {i}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: tokens.sizeBase * 0.7,
          color: tokens.inkSoft,
          marginTop: 4,
          fontFamily: tokens.fontBody,
        }}
      >
        <span>Not likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

function EmojiScale({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  const emojis = ["😫", "😕", "😐", "🙂", "🤩"];
  const [selected, setSelected] = React.useState<number | null>(null);

  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }} role="group" aria-label={q.label}>
        {emojis.map((e, i) => (
          <button
            key={i}
            type="button"
            aria-label={["Terrible", "Bad", "Okay", "Good", "Amazing"][i]}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
            style={{
              fontSize: tokens.sizeBase * 2,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              opacity: selected === null || selected === i ? 1 : 0.4,
              transform: selected === i ? "scale(1.2)" : "scale(1)",
              transition: "all .15s",
              padding: 0,
              lineHeight: 1,
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function RadioField({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const opts = q.options ?? [];

  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }} role="radiogroup" aria-label={q.label}>
        {opts.map((opt, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            onClick={() => setSelected(i)}
            style={{
              ...fieldBaseStyle(tokens),
              textAlign: "left" as const,
              cursor: "pointer",
              backgroundColor:
                selected === i ? hexAlpha(tokens.accent, 0.08) : hexAlpha(tokens.surface, 0.6),
              borderColor: selected === i ? tokens.accent : hexAlpha(tokens.line, 0.5),
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxField({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  const [checked, setChecked] = React.useState<Set<number>>(new Set());
  const opts = q.options ?? [];

  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {opts.map((opt, i) => {
          const isChecked = checked.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = new Set(checked);
                if (isChecked) next.delete(i);
                else next.add(i);
                setChecked(next);
              }}
              style={{
                ...fieldBaseStyle(tokens),
                textAlign: "left" as const,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: isChecked
                  ? hexAlpha(tokens.accent, 0.08)
                  : hexAlpha(tokens.surface, 0.6),
                borderColor: isChecked ? tokens.accent : hexAlpha(tokens.line, 0.5),
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: `1.5px solid ${isChecked ? tokens.accent : tokens.inkSoft}`,
                  backgroundColor: isChecked ? tokens.accent : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tokens.accentInk,
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {isChecked ? "✓" : ""}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DropdownField({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <select
        style={{
          ...fieldBaseStyle(tokens),
          cursor: "pointer",
          appearance: "none" as const,
          backgroundImage: "none",
        }}
      >
        <option value="">Select…</option>
        {(q.options ?? []).map((opt, i) => (
          <option key={i} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileUpload({ q, tokens }: { q: StudioQuestion; tokens: DesignTokens }) {
  return (
    <div>
      <FieldLabel label={q.label} required={q.required} tokens={tokens} />
      <div
        style={{
          ...fieldBaseStyle(tokens),
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 80,
          borderStyle: "dashed",
          color: tokens.inkSoft,
          fontSize: tokens.sizeBase * 0.85,
          gap: 4,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 24 }}>📎</span>
        <span>Click or drop file here</span>
      </div>
    </div>
  );
}

/* ─── Submit button ───────────────────────────────────────────────────────── */

function SubmitButton({ tokens, label = "Submit" }: { tokens: DesignTokens; label?: string }) {
  const btnStyle = tokens.buttonStyle;
  const r =
    btnStyle === "pill" ? 999 : btnStyle === "block" ? 0 : tokens.radius;

  const base: React.CSSProperties = {
    fontFamily: tokens.fontBody,
    fontSize: tokens.sizeBase,
    fontWeight: 600,
    padding: "12px 32px",
    borderRadius: r,
    cursor: "pointer",
    transition: "all .2s",
    width: btnStyle === "block" ? "100%" : "auto",
    border: "none",
    textTransform: btnStyle === "block" ? "uppercase" : "none",
    letterSpacing: btnStyle === "block" ? "0.08em" : "normal",
  };

  if (btnStyle === "ghost") {
    base.backgroundColor = "transparent";
    base.color = tokens.accent;
    base.border = `1.5px solid ${tokens.accent}`;
  } else {
    base.backgroundColor = tokens.accent;
    base.color = tokens.accentInk;
  }

  if (tokens.shadow === "hard") {
    base.boxShadow = `3px 3px 0 ${tokens.ink}`;
  } else if (tokens.shadow === "soft") {
    base.boxShadow = `0 4px 14px ${hexAlpha(tokens.accent, 0.3)}`;
  } else if (tokens.shadow === "glow") {
    base.boxShadow = `0 0 20px ${hexAlpha(tokens.accent, 0.4)}`;
  }

  return <button type="button" style={base}>{label}</button>;
}

/* ─── Render field by type ────────────────────────────────────────────────── */

export const StudioField = React.memo(function StudioField({ question, tokens }: { question: StudioQuestion; tokens: DesignTokens }) {
  switch (question.type) {
    case "shorttext":
      return <ShortTextField q={question} tokens={tokens} />;
    case "longtext":
      return <LongTextField q={question} tokens={tokens} />;
    case "stars":
      return <StarRating q={question} tokens={tokens} />;
    case "nps":
      return <NpsField q={question} tokens={tokens} />;
    case "emoji":
      return <EmojiScale q={question} tokens={tokens} />;
    case "radio":
      return <RadioField q={question} tokens={tokens} />;
    case "checkbox":
      return <CheckboxField q={question} tokens={tokens} />;
    case "dropdown":
      return <DropdownField q={question} tokens={tokens} />;
    case "file":
      return <FileUpload q={question} tokens={tokens} />;
    default:
      return null;
  }
});

const MemoSubmitButton = React.memo(SubmitButton);

export { MemoSubmitButton as SubmitButton, hexAlpha, fieldBaseStyle };
