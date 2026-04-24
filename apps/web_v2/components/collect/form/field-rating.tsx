"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { useFormContext } from "./form-context";
import { FieldWrapper } from "./field-primitives";

/* ─── Star rating ─────────────────────────────────────────────────────────── */

export function StarRating({ q }: { q: StudioQuestion }) {
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

export function NpsField({ q }: { q: StudioQuestion }) {
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

export function EmojiScale({ q }: { q: StudioQuestion }) {
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
