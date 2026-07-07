"use client";

/**
 * SnippetBlock — a titled, copyable code/link block used by the studios'
 * Publish panels and the widget share drawer. One implementation so the
 * copy affordance (spinner → check → reset) behaves identically everywhere
 * a user can copy an embed snippet or public link.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  Copy as CopyIcon,
  Check as CheckIcon,
  CircleNotch as SpinnerIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function SnippetBlock({
  title,
  hint,
  code,
  actions,
}: {
  title: string;
  hint?: string;
  code: string;
  actions?: React.ReactNode;
}) {
  const [state, setState] = React.useState<"idle" | "copying" | "copied">(
    "idle",
  );

  const onCopy = async () => {
    setState("copying");
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
      toast.success("Copied to clipboard");
      window.setTimeout(() => setState("idle"), 1400);
    } catch {
      setState("idle");
      toast.error("Couldn't copy. Try again.");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-foreground">
            {title}
          </div>
          {hint && (
            <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10.5px] font-medium",
              "transition-[border-color,background,color] duration-150",
              state === "copied"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {state === "copying" ? (
              <SpinnerIcon
                className="size-3 animate-spin"
                weight="bold"
                aria-hidden
              />
            ) : state === "copied" ? (
              <CheckIcon className="size-3" weight="bold" aria-hidden />
            ) : (
              <CopyIcon className="size-3" weight="bold" aria-hidden />
            )}
            {state === "copied" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre
        className={cn(
          "max-h-48 overflow-auto p-3 font-mono text-[11px] leading-relaxed",
          "text-foreground/90",
        )}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
