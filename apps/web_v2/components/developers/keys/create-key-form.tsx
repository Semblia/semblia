"use client";

/**
 * CreateKeyForm — step 1 picks what the key may do, step 2 shows it once.
 *
 * Three things changed beyond the structure:
 *
 *  1. **The "Allowed origins" and "IP allowlist" fields are gone.** They were
 *     collected and then dropped on the floor — `createApiKey` has no field for
 *     either, so every value typed there was silently discarded. A control that
 *     has never done anything is deleted, not memorialised.
 *  2. **A failed create says so.** The old handler had a `finally` and no
 *     `catch`: a rejected request cleared the spinner and left the form looking
 *     untouched, with no way to tell whether a key had been minted.
 *  3. **The scope list lost its box.** It was a bordered, tinted panel holding
 *     bordered warning notes — containers inside a container. Groups are now
 *     headings and hairlines inside the one sanctioned fieldset.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { WarningIcon } from "@phosphor-icons/react";
import type { V2ApiKeyScope } from "@workspace/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterPills, SettingsSection } from "@/components/shared";
import { developerKeysPath } from "@/lib/routes";
import { useCreateApiKey } from "@/hooks/api";
import { ConfirmCloseDialog } from "@/components/developers/shared/reveal-step";
import {
  CreateKeyError,
  CreateKeyLayout,
  CreatedKeySecret,
  createKeyErrorMessage,
} from "../access-keys/create-key-shell";

export type ApiKeyType = "PUBLISHABLE" | "SECRET";

/* ─── Expiry ──────────────────────────────────────────────────────────────── */

type ExpiryPreset = "never" | "30d" | "90d" | "1y";

const EXPIRY_OPTS: { id: ExpiryPreset; label: string }[] = [
  { id: "never", label: "Never" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "1y", label: "1 year" },
];

const DAY_MS = 86_400_000;

function expiryToDate(preset: ExpiryPreset): Date | null {
  const now = Date.now();
  if (preset === "never") return null;
  if (preset === "30d") return new Date(now + 30 * DAY_MS);
  if (preset === "90d") return new Date(now + 90 * DAY_MS);
  return new Date(now + 365 * DAY_MS);
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
    label: "Responses",
    scopes: [
      {
        id: "responses:read",
        label: "responses:read",
        description: "Read collected feedback.",
      },
      {
        id: "responses:annotate",
        label: "responses:annotate",
        description: "Add internal notes and tags.",
      },
      {
        id: "responses:moderate",
        label: "responses:moderate",
        description: "Approve, reject, or flag.",
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
    description:
      "A leaked credentials:write key can mint more keys, including keys with this same scope.",
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

const DEFAULT_SCOPES: V2ApiKeyScope[] = ["project:read", "responses:read"];

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
          "-mx-2 flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 transition-colors duration-(--duration-base)",
          checked ? "bg-muted/25" : "hover:bg-muted/25",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[11px] font-medium text-foreground">
            {scope.label}
          </span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            {scope.description}
          </span>
        </span>
      </label>
    </li>
  );
}

function ScopeGroupBlock({
  group,
  selected,
  onToggle,
}: {
  group: ScopeGroup;
  selected: V2ApiKeyScope[];
  onToggle: (scope: V2ApiKeyScope) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground">{group.label}</p>
      <ul className="divide-y divide-border/50">
        {group.scopes.map((scope) => (
          <ScopeRow
            key={scope.id}
            scope={scope}
            checked={selected.includes(scope.id)}
            onToggle={() => onToggle(scope.id)}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Sensitive scopes stay collapsed until asked for, so nobody grants
 * key-minting rights by scanning down a list. The warning is a rule and a tint,
 * not a second bordered box inside the fieldset.
 */
function SensitiveScopes({
  groups,
  selected,
  onToggle,
}: {
  groups: ScopeGroup[];
  selected: V2ApiKeyScope[];
  onToggle: (scope: V2ApiKeyScope) => void;
}) {
  const [shown, setShown] = React.useState(() =>
    selected.some((s) => s === "credentials:read" || s === "credentials:write"),
  );

  if (groups.length === 0) return null;

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => setShown(true)}
        className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-destructive/90 underline decoration-destructive/30 underline-offset-4 transition-colors duration-(--duration-base) hover:text-destructive hover:decoration-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <WarningIcon className="size-3.5" weight="bold" aria-hidden />
        Show sensitive scopes
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-destructive">
              {group.label}
            </p>
            <button
              type="button"
              onClick={() => setShown(false)}
              className="rounded-md text-xs text-muted-foreground transition-colors duration-(--duration-base) hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              Hide
            </button>
          </div>
          {group.description && (
            <p className="border-l-2 border-destructive/50 bg-destructive/5 py-1.5 pl-3 text-[11px] leading-relaxed text-destructive">
              {group.description}
            </p>
          )}
          <ul className="divide-y divide-border/50">
            {group.scopes.map((scope) => (
              <ScopeRow
                key={scope.id}
                scope={scope}
                checked={selected.includes(scope.id)}
                onToggle={() => onToggle(scope.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ─── Form ────────────────────────────────────────────────────────────────── */

interface DraftState {
  name: string;
  expiry: ExpiryPreset;
  scopes: V2ApiKeyScope[];
}

const EMPTY_DRAFT: DraftState = {
  name: "",
  expiry: "never",
  scopes: DEFAULT_SCOPES,
};

const SAFE_GROUPS = SCOPE_GROUPS.filter((g) => g.tone !== "danger");
const DANGER_GROUPS = SCOPE_GROUPS.filter((g) => g.tone === "danger");

const MIN_NAME = 3;

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
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [secretMissing, setSecretMissing] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const isPublishable = type === "PUBLISHABLE";
  const backHref = developerKeysPath(slug);
  const trimmedName = draft.name.trim();
  const valid = trimmedName.length >= MIN_NAME && draft.scopes.length > 0;

  function patch(next: Partial<DraftState>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function toggleScope(scope: V2ApiKeyScope) {
    setDraft((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  }

  async function handleSubmit() {
    setSecretMissing(false);
    const expiry = expiryToDate(draft.expiry);
    try {
      const result = await createMutation.mutateAsync({
        name: trimmedName,
        scopes: draft.scopes,
        expiresAt: expiry ? expiry.toISOString() : undefined,
      });
      const secret = result.secret ?? result.key ?? null;
      if (!secret) {
        // The key exists server-side, so calling this a failure would be false.
        setSecretMissing(true);
        return;
      }
      setPlaintext(secret);
    } catch {
      // Rendered from createMutation.error, below the fields that caused it.
    }
  }

  function attemptLeave() {
    if (plaintext != null) {
      setConfirmClose(true);
      return;
    }
    router.push(backHref);
  }

  function leave() {
    setConfirmClose(false);
    setPlaintext(null);
    // Drop the plaintext from the mutation cache as well, so no copy survives
    // this navigation anywhere in the client.
    createMutation.reset();
    router.push(backHref);
  }

  if (plaintext != null) {
    return (
      <>
        <CreateKeyLayout
          title="Key created"
          meta="Step 2 of 2 · shown once"
          backLabel="Back to API keys"
          onBack={attemptLeave}
        >
          <CreatedKeySecret plaintext={plaintext} onDone={leave} />
        </CreateKeyLayout>

        <ConfirmCloseDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          onConfirm={leave}
        />
      </>
    );
  }

  return (
    <CreateKeyLayout
      title={`New ${isPublishable ? "publishable" : "secret"} key`}
      meta={
        isPublishable
          ? "Step 1 of 2 · read-only, safe in browser code"
          : "Step 1 of 2 · full access, server-side only"
      }
      backLabel="Back to API keys"
      onBack={attemptLeave}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !createMutation.isPending) handleSubmit();
        }}
        className="space-y-6"
      >
        <SettingsSection
          id="key-basics"
          title="Identity and expiry"
          description="The name is how this key is identified in the list, in activity, and in support requests. It is not part of the secret."
        >
          <div className="space-y-1.5">
            <Label htmlFor="key-name">
              Name{" "}
              <span aria-hidden className="text-destructive">
                *
              </span>
            </Label>
            <Input
              id="key-name"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="e.g. Production embed"
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key-expiry">Expiry</Label>
            <FilterPills
              options={EXPIRY_OPTS}
              value={draft.expiry}
              onChange={(value) => patch({ expiry: value })}
              aria-label="Expiry"
            />
            <p className="text-xs text-muted-foreground">
              An expired key stops authenticating on its own. Semblia never
              rotates it for you.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          id="key-scopes"
          title="Scopes"
          description="Everything this key may reach. Scopes are fixed once the key is issued — widening them later means a new key."
          actions={
            <button
              type="button"
              onClick={() => patch({ scopes: DEFAULT_SCOPES })}
              className="rounded-md text-xs font-medium text-muted-foreground transition-colors duration-(--duration-base) hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              Reset to defaults
            </button>
          }
        >
          {SAFE_GROUPS.map((group) => (
            <ScopeGroupBlock
              key={group.label}
              group={group}
              selected={draft.scopes}
              onToggle={toggleScope}
            />
          ))}

          <SensitiveScopes
            groups={DANGER_GROUPS}
            selected={draft.scopes}
            onToggle={toggleScope}
          />
        </SettingsSection>

        <CreateKeyError
          message={
            secretMissing
              ? "The key was created, but Semblia didn't receive the secret to show you. Revoke it from the key list and create another."
              : createMutation.error
                ? createKeyErrorMessage(createMutation.error, "API keys")
                : null
          }
        />

        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          {!valid && (
            <p className="mr-auto text-xs text-muted-foreground">
              {trimmedName.length < MIN_NAME
                ? `Give the key a name of at least ${MIN_NAME} characters.`
                : "Pick at least one scope — a key with none is refused on every request."}
            </p>
          )}
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
            className="tactile"
            disabled={!valid || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create key"}
          </Button>
        </div>
      </form>
    </CreateKeyLayout>
  );
}
