"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { V2ApiKeyScope } from "@workspace/types";
import { XIcon, WarningIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateApiKey } from "@/hooks/api";
import {
  RevealPanel,
  ConfirmCloseDialog,
} from "@/components/developers/shared/reveal-step";

export type ApiKeyType = "PUBLISHABLE" | "SECRET";

/* ─── Chip input ──────────────────────────────────────────────────────────── */

function ChipInput({
  values,
  onChange,
  placeholder,
  validate,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  validate?: (v: string) => boolean;
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
      className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring"
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

/* ─── Scope catalog ───────────────────────────────────────────────────────── */

interface ScopeGroup {
  label: string;
  tone?: "default" | "danger";
  description?: string;
  scopes: { id: V2ApiKeyScope; label: string; description: string }[];
}

const SCOPE_GROUPS: ScopeGroup[] = [
  {
    label: "Project",
    scopes: [
      {
        id: "project:read",
        label: "project:read",
        description: "Read project metadata and settings.",
      },
    ],
  },
  {
    label: "Submissions",
    scopes: [
      {
        id: "submissions:read",
        label: "submissions:read",
        description: "Read collected feedback.",
      },
      {
        id: "submissions:annotate",
        label: "submissions:annotate",
        description: "Add internal notes and tags.",
      },
      {
        id: "submissions:moderate",
        label: "submissions:moderate",
        description: "Approve, reject, or flag.",
      },
    ],
  },
  {
    label: "Testimonials",
    scopes: [
      {
        id: "testimonials:read",
        label: "testimonials:read",
        description: "Read published and pending.",
      },
      {
        id: "testimonials:publish",
        label: "testimonials:publish",
        description: "Publish so they appear publicly.",
      },
      {
        id: "testimonials:unpublish",
        label: "testimonials:unpublish",
        description: "Unpublish.",
      },
    ],
  },
  {
    label: "Analytics",
    scopes: [
      {
        id: "analytics:read",
        label: "analytics:read",
        description: "Read summaries and event counts.",
      },
    ],
  },
  {
    label: "Exports",
    scopes: [
      {
        id: "exports:read",
        label: "exports:read",
        description: "List and download exports.",
      },
      {
        id: "exports:write",
        label: "exports:write",
        description: "Trigger new exports.",
      },
    ],
  },
  {
    label: "Webhooks",
    scopes: [
      {
        id: "webhooks:read",
        label: "webhooks:read",
        description: "List endpoints and deliveries.",
      },
      {
        id: "webhooks:write",
        label: "webhooks:write",
        description: "Create, rotate, or revoke endpoints.",
      },
    ],
  },
  {
    label: "Integrations",
    scopes: [
      {
        id: "integrations:read",
        label: "integrations:read",
        description: "Read connection state.",
      },
      {
        id: "integrations:write",
        label: "integrations:write",
        description: "Manage native integration connections.",
      },
    ],
  },
  {
    label: "Credentials",
    tone: "danger",
    description: "A leaked credentials:write key can mint more keys.",
    scopes: [
      {
        id: "credentials:read",
        label: "credentials:read",
        description: "List keys (metadata only).",
      },
      {
        id: "credentials:write",
        label: "credentials:write",
        description: "Create, rotate, or revoke keys.",
      },
    ],
  },
  {
    label: "Agent",
    scopes: [
      {
        id: "agent:read",
        label: "agent:read",
        description: "Read-only agent surface.",
      },
      {
        id: "agent:write",
        label: "agent:write",
        description: "Agent-side writes for gated workflows.",
      },
    ],
  },
];

const DEFAULT_SCOPES: V2ApiKeyScope[] = [
  "project:read",
  "submissions:read",
  "testimonials:read",
];

function ScopeRow({
  scope,
  checked,
  onToggle,
}: {
  scope: { id: V2ApiKeyScope; label: string; description: string };
  checked: boolean;
  onToggle: () => void;
}) {
  const id = `scope-${scope.id}`;
  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors",
          checked ? "bg-background" : "hover:bg-background/60",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium text-foreground">
            {scope.label}
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {scope.description}
          </p>
        </div>
      </label>
    </li>
  );
}

function ScopeSelector({
  selected,
  onChange,
}: {
  selected: V2ApiKeyScope[];
  onChange: (next: V2ApiKeyScope[]) => void;
}) {
  const [showSensitive, setShowSensitive] = React.useState(() =>
    selected.some((s) => s === "credentials:read" || s === "credentials:write"),
  );

  function toggle(scope: V2ApiKeyScope) {
    if (selected.includes(scope)) {
      onChange(selected.filter((s) => s !== scope));
    } else {
      onChange([...selected, scope]);
    }
  }

  const dangerGroups = SCOPE_GROUPS.filter((g) => g.tone === "danger");
  const safeGroups = SCOPE_GROUPS.filter((g) => g.tone !== "danger");

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>
          Scopes{" "}
          <span className="font-normal text-muted-foreground">
            ({selected.length})
          </span>
        </Label>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SCOPES)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
        <ul className="space-y-3">
          {safeGroups.map((group) => (
            <li key={group.label}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.scopes.map((scope) => (
                  <ScopeRow
                    key={scope.id}
                    scope={scope}
                    checked={selected.includes(scope.id)}
                    onToggle={() => toggle(scope.id)}
                  />
                ))}
              </ul>
            </li>
          ))}

          {dangerGroups.length > 0 && (
            <li>
              {!showSensitive ? (
                <button
                  type="button"
                  onClick={() => setShowSensitive(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-destructive/40 px-2 py-1.5 text-[11px] font-medium text-destructive/80 hover:bg-destructive/5 hover:text-destructive"
                >
                  <WarningIcon className="size-3" weight="bold" aria-hidden />
                  Show sensitive scopes
                </button>
              ) : (
                <>
                  {dangerGroups.map((group) => (
                    <div key={group.label} className="space-y-1">
                      <div className="mb-1 flex items-baseline justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-destructive">
                          {group.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSensitive(false)}
                          className="text-[11px] font-normal text-muted-foreground hover:text-foreground"
                        >
                          Hide
                        </button>
                      </div>
                      {group.description && (
                        <p className="mb-1 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] leading-snug text-destructive">
                          <WarningIcon
                            className="mt-0.5 size-3 shrink-0"
                            weight="bold"
                            aria-hidden
                          />
                          {group.description}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {group.scopes.map((scope) => (
                          <ScopeRow
                            key={scope.id}
                            scope={scope}
                            checked={selected.includes(scope.id)}
                            onToggle={() => toggle(scope.id)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ─── Form ────────────────────────────────────────────────────────────────── */

interface DraftState {
  name: string;
  expiry: ExpiryPreset;
  origins: string[];
  ips: string[];
  scopes: V2ApiKeyScope[];
}

const EMPTY_DRAFT: DraftState = {
  name: "",
  expiry: "never",
  origins: [],
  ips: [],
  scopes: DEFAULT_SCOPES,
};

export function CreateKeyForm({
  type,
  slug,
}: {
  type: ApiKeyType;
  slug: string;
}) {
  const router = useRouter();
  const createMutation = useCreateApiKey(slug);

  const [draft, setDraft] = React.useState<DraftState>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = React.useState(false);
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const isPublishable = type === "PUBLISHABLE";
  const valid = draft.name.trim().length >= 3 && draft.scopes.length > 0;
  const backHref = `/projects/${slug}/developers/keys`;

  function patch(next: Partial<DraftState>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const expiry = expiryToDate(draft.expiry);
      const result = await createMutation.mutateAsync({
        name: draft.name.trim(),
        scopes: draft.scopes,
        expiresAt: expiry ? expiry.toISOString() : undefined,
      });
      setPlaintext(result.secret ?? result.key ?? "");
    } finally {
      setSubmitting(false);
    }
  }

  function attemptLeave() {
    if (plaintext != null) {
      setConfirmClose(true);
      return;
    }
    router.push(backHref);
  }

  function confirmLeave() {
    setConfirmClose(false);
    router.push(backHref);
  }

  if (plaintext != null) {
    return (
      <>
        <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Step 2 of 2
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              Key created
            </h1>
          </div>
          <RevealPanel plaintext={plaintext} onDone={confirmLeave} />
        </div>

        <ConfirmCloseDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          onConfirm={confirmLeave}
        />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <button
        type="button"
        onClick={attemptLeave}
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" weight="bold" aria-hidden />
        Back to keys
      </button>

      <div className="mb-6 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Step 1 of 2
        </p>
        <h1 className="text-lg font-semibold text-foreground">
          New {isPublishable ? "publishable" : "secret"} key
        </h1>
        <p className="text-xs text-muted-foreground">
          {isPublishable
            ? "Read-only. Safe for browser code."
            : "Full access. Server-side only."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="key-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="key-name"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Production embed"
            maxLength={50}
            autoFocus
          />
        </div>

        <ScopeSelector
          selected={draft.scopes}
          onChange={(next) => patch({ scopes: next })}
        />

        <div className="space-y-1.5">
          <Label>Expiry</Label>
          <div className="flex flex-wrap gap-1.5">
            {EXPIRY_OPTS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ expiry: opt.id })}
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

        {isPublishable && (
          <div className="space-y-1.5">
            <Label>
              Allowed origins{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <ChipInput
              values={draft.origins}
              onChange={(v) => patch({ origins: v })}
              placeholder="https://example.com — Enter to add"
              validate={(v) => /^https?:\/\/.+/.test(v)}
            />
          </div>
        )}

        {!isPublishable && (
          <div className="space-y-1.5">
            <Label>
              IP allowlist{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <ChipInput
              values={draft.ips}
              onChange={(v) => patch({ ips: v })}
              placeholder="203.0.113.0/24 — Enter to add"
              validate={(v) => /^[\d.:/a-fA-F]+$/.test(v)}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={attemptLeave}
          >
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
        </div>
      </form>
    </div>
  );
}
