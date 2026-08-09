"use client";

/**
 * TagInput — the internal tag field on General settings.
 *
 * Type roles are split by purpose, not by size: control text is Label
 * (`text-sm`), and the chips are the one step below it (`text-xs`). The bespoke
 * `text-[11px]` these used to carry was a third size inside a single card,
 * which is the drift the type scale exists to prevent.
 */

import * as React from "react";
import { XIcon } from "@phosphor-icons/react";

export interface TagInputProps {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({
  values,
  onChange,
  suggestions,
  placeholder = "Add tags…",
}: TagInputProps) {
  const [input, setInput] = React.useState("");

  function add(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput("");
  }

  const suggested =
    suggestions
      ?.filter((s) => !values.includes(s) && s.includes(input.toLowerCase()))
      .slice(0, 6) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${v}`}
            >
              <XIcon className="size-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            }
            if (e.key === "Backspace" && !input && values.length)
              onChange(values.slice(0, -1));
          }}
          placeholder={values.length === 0 ? placeholder : undefined}
          className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {suggested.length > 0 && input && (
        <div className="flex flex-wrap gap-1">
          {suggested.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
