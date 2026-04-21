"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Inline name (click-to-rename) ──────────────────────────────────────── */

export function InlineName({
  value,
  muted,
  dirty,
  onCommit,
}: {
  value: string;
  muted: boolean;
  dirty: boolean;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={cn(
          "truncate bg-transparent text-[13px] font-medium outline-none",
          "border-b border-dashed border-muted-foreground/30",
          "text-foreground",
        )}
        style={{ width: "100%", padding: 0, margin: 0, lineHeight: "inherit" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn(
        "truncate text-left text-[13px] font-medium",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {value}{dirty && <span className="text-muted-foreground">*</span>}
    </button>
  );
}
