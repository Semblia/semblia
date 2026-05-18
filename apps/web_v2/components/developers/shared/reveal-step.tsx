"use client";

import * as React from "react";
import { CopyIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SecretRowProps {
  plaintext: string;
}

function SecretRow({ plaintext }: SecretRowProps) {
  const [copied, setCopied] = React.useState(false);
  const copyRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    copyRef.current?.focus();
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(plaintext).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-muted/50">
      <code className="flex-1 overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed tracking-tight">
        {plaintext}
      </code>
      <button
        ref={copyRef}
        onClick={handleCopy}
        aria-live="polite"
        className={cn(
          "flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs font-medium transition-colors",
          copied
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-background hover:text-foreground",
        )}
        aria-label="Copy key"
      >
        {copied ? (
          <>
            <CheckCircleIcon className="size-3.5" /> Copied
          </>
        ) : (
          <>
            <CopyIcon className="size-3.5" /> Copy
          </>
        )}
      </button>
    </div>
  );
}

/**
 * RevealPanel — inline (non-dialog) plaintext-secret display for page-level
 * create flows. Shows the secret once with copy affordance.
 */
export function RevealPanel({
  plaintext,
  onDone,
}: {
  plaintext: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">
        Your new key — copy it now
      </p>
      <p className="text-xs text-muted-foreground">
        We won&apos;t show it again. Lose it and you&apos;ll need to rotate.
      </p>
      <SecretRow plaintext={plaintext} />
      <div className="flex justify-end">
        <Button size="sm" onClick={onDone}>
          I&apos;ve saved it
        </Button>
      </div>
    </div>
  );
}

/**
 * RevealStep — dialog-hosted variant for rotation flows that surface a new
 * secret without leaving the current detail page.
 */
export function RevealStep({
  plaintext,
  onClose,
}: {
  plaintext: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          Your new key — copy it now
        </p>
        <p className="text-xs text-muted-foreground">
          We won&apos;t show it again. Lose it and you&apos;ll need to rotate.
        </p>
      </div>
      <SecretRow plaintext={plaintext} />
      <DialogFooter>
        <Button size="sm" onClick={onClose} className="gap-1.5">
          I&apos;ve saved it
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ConfirmCloseDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Leave without copying?</DialogTitle>
          <DialogDescription>
            The key won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Stay
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
