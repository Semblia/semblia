"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Sticky settings save/discard bar ───────────────────────────────────────────
//
// Appears at the bottom of an editable settings surface. When there are unsaved
// changes it surfaces a clear left-aligned indicator so the bar reads as a
// deliberate action region rather than a stray pair of buttons.

export interface SettingsFooterProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  canSave?: boolean;
}

export function SettingsFooter({
  dirty,
  saving,
  onSave,
  onDiscard,
  canSave,
}: SettingsFooterProps) {
  const saveEnabled = (canSave ?? dirty) && !saving;
  return (
    <div
      className="sticky bottom-0 z-10 border-t border-border bg-background px-4 py-3 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "flex items-center gap-2 text-xs transition-opacity",
            dirty ? "text-muted-foreground opacity-100" : "opacity-0",
          )}
        >
          <span className="size-1.5 rounded-full bg-warning" aria-hidden />
          {saving ? "Saving changes…" : "You have unsaved changes"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="text-muted-foreground"
            disabled={!dirty || saving}
          >
            Discard
          </Button>
          <Button
            size="sm"
            disabled={!saveEnabled}
            onClick={onSave}
            className="min-w-[7rem] tactile"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
