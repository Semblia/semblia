"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
type ApiKeyType = "PUBLISHABLE" | "SECRET";
import {
  XIcon,
  CopyIcon,
  WarningIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateApiKey } from "@/hooks/api";

/* ─── Chip input ──────────────────────────────────────────────────────────── */

function ChipInput({
  values,
  onChange,
  placeholder,
  validate,
  className,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  validate?: (v: string) => boolean;
  className?: string;
}) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function commit() {
    const val = input.trim();
    if (!val) return;
    if (validate && !validate(val)) return;
    if (!values.includes(val)) onChange([...values, val]);
    setInput("");
  }

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px]"
        >
          {v}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(values.filter((x) => x !== v));
            }}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${v}`}
          >
            <XIcon className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Backspace" && !input && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : undefined}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* ─── Expiry presets ──────────────────────────────────────────────────────── */

type ExpiryPreset = "30d" | "90d" | "1y" | "never";

const EXPIRY_OPTS: { id: ExpiryPreset; label: string }[] = [
  { id: "never", label: "Never" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "1y", label: "1 year" },
];

function expiryToDate(preset: ExpiryPreset): Date | null {
  const now = Date.now();
  if (preset === "never") return null;
  if (preset === "30d") return new Date(now + 30 * 86400_000);
  if (preset === "90d") return new Date(now + 90 * 86400_000);
  return new Date(now + 365 * 86400_000);
}

/* ─── Draft step ──────────────────────────────────────────────────────────── */

interface DraftState {
  name: string;
  expiry: ExpiryPreset;
  origins: string[];
  ips: string[];
}

function DraftStep({
  type,
  draft,
  onChange,
  onSubmit,
  submitting,
  onCancel,
}: {
  type: ApiKeyType;
  draft: DraftState;
  onChange: (patch: Partial<DraftState>) => void;
  onSubmit: () => void;
  submitting: boolean;
  onCancel: () => void;
}) {
  const isPublishable = type === "PUBLISHABLE";
  const valid = draft.name.trim().length >= 3;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit();
      }}
      className="space-y-4"
    >
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="key-name">
          Key name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="key-name"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Production embed"
          maxLength={50}
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground">
          {draft.name.length}/50 characters
        </p>
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <Label>Expiry</Label>
        <div className="flex flex-wrap gap-1.5">
          {EXPIRY_OPTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ expiry: opt.id })}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                draft.expiry === opt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Publishable: allowed origins */}
      {isPublishable && (
        <div className="space-y-1.5">
          <Label>Allowed origins</Label>
          <ChipInput
            values={draft.origins}
            onChange={(v) => onChange({ origins: v })}
            placeholder="https://example.com — press Enter to add"
            validate={(v) => /^https?:\/\/.+/.test(v)}
          />
          <p className="text-[11px] text-muted-foreground">
            Requests from other origins will be blocked. Leave empty to allow
            all.
          </p>
        </div>
      )}

      {/* Secret: IP allowlist + warning */}
      {!isPublishable && (
        <>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
              <WarningIcon className="mt-0.5 size-3.5 shrink-0" weight="fill" />
              Treat like a password. Never paste in client code, repos, or chat
              messages.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>
              IP allowlist{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <ChipInput
              values={draft.ips}
              onChange={(v) => onChange({ ips: v })}
              placeholder="203.0.113.0/24 — press Enter to add"
              validate={(v) => /^[\d.:/a-fA-F]+$/.test(v)}
            />
            <p className="text-[11px] text-muted-foreground">
              Restrict to your server IPs or CIDR blocks. Leave empty for any
              IP.
            </p>
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!valid || submitting}
          className="gap-1.5"
        >
          {submitting ? "Creating…" : "Create key"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ─── Reveal step ─────────────────────────────────────────────────────────── */

function RevealStep({
  plaintext,
  onClose,
}: {
  plaintext: string;
  onClose: () => void;
}) {
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
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          Your new key — copy it now
        </p>
        <p className="text-xs text-muted-foreground">
          We won&apos;t show it again. If you lose it, rotate to get a new one.
        </p>
      </div>

      <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-muted/50">
        <code className="flex-1 overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed tracking-tight">
          {plaintext}
        </code>
        <button
          ref={copyRef}
          onClick={handleCopy}
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

      <DialogFooter>
        <Button size="sm" onClick={onClose} className="gap-1.5">
          I&apos;ve saved it
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ─── Dialog ──────────────────────────────────────────────────────────────── */

const EMPTY_DRAFT: DraftState = {
  name: "",
  expiry: "never",
  origins: [],
  ips: [],
};

export function CreateKeyDialog({
  open,
  initialType,
  slug,
  onOpenChange,
}: {
  open: boolean;
  initialType: ApiKeyType;
  slug: string;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateApiKey(slug);
  const [draft, setDraft] = React.useState<DraftState>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = React.useState(false);
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const step = plaintext != null ? "reveal" : "draft";

  function reset() {
    setDraft(EMPTY_DRAFT);
    setPlaintext(null);
    setSubmitting(false);
    setConfirmClose(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      if (step === "reveal") {
        // During reveal, confirm before close
        setConfirmClose(true);
        return;
      }
      reset();
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  }

  function handleConfirmClose() {
    reset();
    onOpenChange(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const expiry = expiryToDate(draft.expiry);
      const result = await createMutation.mutateAsync({
        name: draft.name.trim(),
        expiresAt: expiry ? expiry.toISOString() : undefined,
      });
      // V2CreatedApiKeyDTO has `secret` (the plaintext key)
      setPlaintext(result.secret ?? result.key ?? "");
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    step === "reveal"
      ? "Key created"
      : `Create ${initialType.toLowerCase()} key`;

  const description =
    step === "reveal"
      ? undefined
      : initialType === "PUBLISHABLE"
        ? "Safe for browser code. Read-only access. Locked to allowed origins."
        : "For server use only. Full project access. Keep this secret.";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <AnimatePresence mode="wait" initial={false}>
            {step === "draft" ? (
              <motion.div
                key="draft"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <DraftStep
                  type={initialType}
                  draft={draft}
                  onChange={(p) => setDraft((prev) => ({ ...prev, ...p }))}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  onCancel={() => handleOpenChange(false)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <RevealStep
                  plaintext={plaintext!}
                  onClose={handleConfirmClose}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Accidental close guard during reveal */}
      {confirmClose && (
        <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Close without copying?</DialogTitle>
              <DialogDescription>
                The key won&apos;t be shown again. Make sure you&apos;ve saved
                it somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClose(false)}
              >
                Go back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmClose}
              >
                Close anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
