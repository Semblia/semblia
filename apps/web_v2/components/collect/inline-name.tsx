"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Inline name (click-to-rename) ──────────────────────────────────────── */

export interface InlineNameProps {
  value: string;
  muted: boolean;
  dirty: boolean;
  onCommit: (next: string) => void;
  /**
   * Controlled editing flag. When provided, the parent owns enter/exit of edit
   * mode; the title no longer captures single click. Pair with `onEditingChange`.
   */
  editing?: boolean;
  /** Called when the component would change its own editing state. */
  onEditingChange?: (editing: boolean) => void;
  /** Optional double-click affordance to enter edit mode (controlled or not). */
  onDoubleClickRename?: () => void;
}

export function InlineName({
  value,
  muted,
  dirty,
  onCommit,
  editing: editingProp,
  onEditingChange,
  onDoubleClickRename,
}: InlineNameProps) {
  const [editingState, setEditingState] = React.useState(false);
  const editing = editingProp ?? editingState;
  const setEditing = React.useCallback(
    (next: boolean) => {
      if (editingProp === undefined) setEditingState(next);
      onEditingChange?.(next);
    },
    [editingProp, onEditingChange],
  );

  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      setDraft(value);
      inputRef.current?.select();
    }
  }, [editing, value]);

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
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
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

  // Controlled mode: parent decides when to edit. Render as static text and
  // forward double-click as a rename request (does not capture single-click).
  if (editingProp !== undefined) {
    return (
      <span
        onDoubleClick={(e) => {
          if (!onDoubleClickRename) return;
          e.stopPropagation();
          onDoubleClickRename();
        }}
        className={cn(
          "block truncate text-[13px] font-medium",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
        {dirty && <span className="text-muted-foreground">*</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "truncate text-left text-[13px] font-medium",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {value}
      {dirty && <span className="text-muted-foreground">*</span>}
    </button>
  );
}
