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

/* ─── Short text ──────────────────────────────────────────────────────────── */

export function ShortTextField({ q }: { q: StudioQuestion }) {
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

export function LongTextField({ q }: { q: StudioQuestion }) {
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
