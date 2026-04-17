"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ExternalLinkIcon,
  RotateCcwIcon,
  SaveIcon,
  CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatRelative(ts: number, now: number): string {
  const delta = Math.max(0, Math.floor((now - ts) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const m = Math.floor(delta / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function EditorTopbar({
  projectName,
  savedAt,
  dirty,
  onSave,
  onReset,
  onOpenPreview,
  mobileToggle,
}: {
  projectName: string;
  savedAt: number;
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  onOpenPreview: () => void;
  mobileToggle?: React.ReactNode;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  const [justSaved, setJustSaved] = React.useState(false);

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const handleSave = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-2.5 sm:px-5 sm:py-3">
      <div className="min-w-0 shrink-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
          Collect · {projectName}
        </h1>
        <p
          data-testid="saved-indicator"
          data-dirty={dirty ? "true" : "false"}
          className={cn(
            "mt-0.5 text-[10px]",
            dirty ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          {dirty ? "Unsaved changes" : `Saved ${formatRelative(savedAt, now)}`}
        </p>
      </div>
      {mobileToggle}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!dirty}
          data-testid="btn-reset"
          className="hidden sm:inline-flex"
        >
          <RotateCcwIcon />
          Reset
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={!dirty}
          data-testid="btn-reset-mobile"
          className="sm:hidden"
        >
          <RotateCcwIcon className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPreview}
          data-testid="btn-open-preview"
          className="hidden lg:inline-flex"
        >
          <ExternalLinkIcon />
          Open canvas
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!dirty}
          data-testid="btn-save"
        >
          <AnimatePresence mode="wait" initial={false}>
            {justSaved ? (
              <motion.span
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <CheckIcon className="size-4" />
              </motion.span>
            ) : (
              <motion.span
                key="save"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <SaveIcon className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
          {justSaved ? "Saved" : "Save"}
        </Button>
      </div>
    </header>
  );
}
