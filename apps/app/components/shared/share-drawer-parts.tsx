"use client";

/**
 * The leaf pieces both share drawers (widgets, forms) compose: a copyable
 * snippet block, a scannable QR card with PNG download, and the drawer tab
 * button. Extracted from the widget share drawer when forms grew the same
 * surface (WS-A3) — one anatomy, two mounts.
 */

import * as React from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import {
  Copy as CopyIcon,
  Check as CheckIcon,
  DownloadSimple as DownloadIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function DrawerTabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: PhosphorIcon;
  label: string;
}) {
  // Deliberately a plain toggle button, not role="tab": the drawer has no
  // tablist/tabpanel wiring or roving focus, and claiming the pattern
  // without its keyboard contract is worse than honest button semantics.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[11.5px] font-medium",
        "transition-colors duration-150",
        active
          ? "border-b-2 border-foreground text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" weight="bold" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

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
            aria-busy={state === "copying"}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10.5px] font-medium",
              "transition-[border-color,background,color] duration-150",
              state === "copied"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {state === "copying" ? (
              <Spinner className="size-3" aria-hidden />
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
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Real, scannable QR with PNG download — fixed black-on-white for print. */
export function ShareQrCard({
  url,
  filename,
  qrTitle,
  description,
}: {
  url: string;
  /** Download name, e.g. `semblia-wall-acme.png`. */
  filename: string;
  /** Accessible title for the QR canvas. */
  qrTitle: string;
  description: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const handleDownload = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("QR not ready yet — try again in a moment.");
      return;
    }
    try {
      const href = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
      toast.success("QR downloaded");
    } catch {
      toast.error("Couldn't export the QR. Try again.");
    }
  }, [filename]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          QR code
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10.5px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        >
          <DownloadIcon className="size-3" weight="bold" aria-hidden />
          PNG
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="shrink-0 rounded-md border border-border bg-white p-2">
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={88}
            level="M"
            marginSize={0}
            fgColor="#000000"
            bgColor="#ffffff"
            title={qrTitle}
          />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
