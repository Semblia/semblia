"use client";

/**
 * TrustClient — the two ways a public submission proves it came from you.
 *
 * A browser submit is trusted by its `Origin`; a server submit is trusted by an
 * HMAC signature. Both are configured here.
 *
 * What this pass changed:
 *   • the page opened with a bordered paragraph explaining the feature, sitting
 *     between the page title and the first control. Page chrome carries
 *     identity and state, never prose — the explanation moved into the two
 *     section descriptions, where it belongs to the thing it describes.
 *   • three more `rounded-lg border` boxes sat inside `SettingsSection`, which
 *     is already the card. They are hairline-divided regions now.
 *   • `GET /allowed-origins` is guarded by MANAGE_PROJECT, so a view-only role
 *     gets a 403 — and the old ladder (`isLoading ? skeleton : rows`) rendered
 *     that as "No origins yet. Add one below", inviting a write that would also
 *     fail. `DataState` derives error and permission first.
 *   • clearing the signing secret was a two-click inline toggle; a destructive,
 *     irreversible action gets a modal with an explicit gate.
 *
 * The origins endpoint returns the project's full list in one array — there is
 * no paginated envelope to render an affordance from.
 */

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO } from "@workspace/types";
import {
  PlusIcon,
  TrashIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DataList,
  DataState,
  EmptyState,
  ItemRow,
  ListSkeleton,
  PageBody,
  SettingsSection,
  useDataState,
} from "@/components/shared";
import {
  useAllowedOrigins,
  useReplaceAllowedOrigins,
  useGenerateSigningSecret,
  useClearSigningSecret,
} from "@/hooks/api";
import { RevealPanel } from "@/components/developers/shared/reveal-step";
import { canManageProject, validateAllowedOrigin } from "./shared/normalize";

const READ_ONLY_TRUST_REASON =
  "Your role on this project is view-only. A project owner or admin manages trusted origins and the signing secret.";

/**
 * Draft-list editing for trusted origins: the server list is the baseline,
 * edits accumulate in a local draft, and Save replaces the whole list.
 */
function useOriginsDraft(slug: string) {
  const query = useAllowedOrigins(slug);
  const replaceMut = useReplaceAllowedOrigins(slug);

  const [draft, setDraft] = React.useState<string[] | null>(null);
  const [input, setInput] = React.useState("");
  const [inputError, setInputError] = React.useState<string | null>(null);

  const baseline = React.useMemo(() => query.data ?? [], [query.data]);
  const current = draft ?? baseline;
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(baseline);

  function handleInputChange(value: string) {
    setInput(value);
    if (inputError) setInputError(null);
  }

  function addOrigin() {
    const trimmed = input.trim();
    const err = validateAllowedOrigin(trimmed);
    if (err) {
      setInputError(err);
      return;
    }
    if (current.includes(trimmed)) {
      setInputError("That origin is already trusted.");
      return;
    }
    setInputError(null);
    setDraft([...current, trimmed]);
    setInput("");
  }

  function removeOrigin(origin: string) {
    setDraft(current.filter((o) => o !== origin));
  }

  async function handleSave() {
    if (draft === null) return;
    try {
      await replaceMut.mutateAsync(draft);
      toast.success("Trusted origins updated");
      setDraft(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save trusted origins",
      );
    }
  }

  function handleDiscard() {
    setDraft(null);
    setInput("");
    setInputError(null);
  }

  return {
    query,
    current,
    dirty,
    saving: replaceMut.isPending,
    input,
    inputError,
    handleInputChange,
    addOrigin,
    removeOrigin,
    handleSave,
    handleDiscard,
  };
}

/**
 * The section footer keeps its three shapes: the read-only reason string, the
 * dirty-state Save/Discard bar, or `undefined` so `SettingsSection` renders no
 * footer at all.
 */
function originsFooter({
  canManage,
  dirty,
  saving,
  onDiscard,
  onSave,
}: {
  canManage: boolean;
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}): React.ReactNode {
  if (!canManage) return READ_ONLY_TRUST_REASON;
  if (!dirty) return undefined;
  return (
    <div className="flex items-center justify-between gap-3">
      <span>Origins take effect as soon as you save.</span>
      <span className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={saving}
          className="text-muted-foreground"
        >
          Discard
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="tactile"
        >
          {saving ? "Saving…" : "Save origins"}
        </Button>
      </span>
    </div>
  );
}

// Add is offered only for a value the API's `allowedOriginSchema` accepts.
function canAddOrigin(input: string, loaded: boolean): boolean {
  const trimmed = input.trim();
  if (!loaded || trimmed.length === 0) return false;
  return !validateAllowedOrigin(trimmed);
}

function OriginRow({
  origin,
  canManage,
  removing,
  onRemove,
}: {
  origin: string;
  canManage: boolean;
  removing: boolean;
  onRemove: (origin: string) => void;
}) {
  return (
    <ItemRow
      // `DataList` renders `role="list"`; without `listitem` the rows
      // are not items to assistive technology.
      role="listitem"
      padding="dense"
      // `ItemShell` shape="row" hard-codes its own bottom hairline,
      // which would double up with the `divide-y` from DataList.
      className="border-b-0"
      aria-label={origin}
      title={
        <span className="truncate font-mono text-xs text-foreground">
          {origin}
        </span>
      }
      trailing={
        canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(origin)}
            disabled={removing}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <TrashIcon className="size-3.5" aria-hidden />
            Remove origin
          </Button>
        ) : undefined
      }
    />
  );
}

/* A hairline, not a second card: the ladder is divider before container. */
function AddOriginField({
  input,
  inputError,
  canAdd,
  onChange,
  onAdd,
}: {
  input: string;
  inputError: string | null;
  canAdd: boolean;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-1.5 border-t border-border/60 px-4 py-4">
      <Label htmlFor="t-origin">Add origin</Label>
      <div className="flex gap-2">
        <Input
          id="t-origin"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="https://example.com"
          className={cn(
            "font-mono",
            inputError &&
              "border-destructive/60 focus-visible:ring-destructive/30",
          )}
          aria-invalid={inputError ? true : undefined}
          aria-describedby={inputError ? "t-origin-error" : "t-origin-help"}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="shrink-0 gap-1.5"
          disabled={!canAdd}
        >
          <PlusIcon className="size-3.5" aria-hidden /> Add origin
        </Button>
      </div>
      {inputError ? (
        <FieldError id="t-origin-error" className="text-xs">
          {inputError}
        </FieldError>
      ) : (
        <p
          id="t-origin-help"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          A full <code className="font-mono">scheme://host</code> with no path.
          https only, except http on localhost.
        </p>
      )}
    </div>
  );
}

function AllowedOriginsSection({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const origins = useOriginsDraft(slug);
  const state = useDataState(origins.query, { count: origins.current.length });
  const loaded = state.kind === "ready" || state.kind === "empty-first-run";
  const canAdd = canAddOrigin(origins.input, loaded);

  return (
    <SettingsSection
      id="allowed-origins"
      title="Trusted origins"
      description="A browser submit is accepted when its Origin header is on this list. Add the production domain plus any staging or local origins your embedded widgets run on."
      flush
      footer={originsFooter({
        canManage,
        dirty: origins.dirty,
        saving: origins.saving,
        onDiscard: origins.handleDiscard,
        onSave: origins.handleSave,
      })}
    >
      <DataState
        state={state}
        resource="trusted origins"
        align="start"
        className="px-4 py-2"
        skeleton={
          <ListSkeleton
            rows={2}
            leading="none"
            trailing={false}
            density="dense"
            className="-mx-4 -my-2"
          />
        }
        empty={
          <EmptyState
            icon={ShieldCheckIcon}
            align="start"
            title="No trusted origins yet"
            description="Until an origin is listed, browser submits are rejected. Server-to-server submits signed with the secret below still work."
          />
        }
      >
        <DataList aria-label="Trusted origins" className="-mx-4 -my-2">
          {origins.current.map((origin) => (
            <OriginRow
              key={origin}
              origin={origin}
              canManage={canManage}
              removing={origins.saving}
              onRemove={origins.removeOrigin}
            />
          ))}
        </DataList>
      </DataState>

      {/* The field appears only once the current list has actually loaded —
          editing a draft against an unknown baseline would let a Save replace
          origins the page had not yet read. */}
      {canManage && loaded && (
        <AddOriginField
          input={origins.input}
          inputError={origins.inputError}
          canAdd={canAdd}
          onChange={origins.handleInputChange}
          onAdd={origins.addOrigin}
        />
      )}
    </SettingsSection>
  );
}

/** One toast shape for both secret mutations: success, message-or-fallback. */
async function runSecretMutation({
  action,
  success,
  failure,
  onSettled,
}: {
  action: () => Promise<unknown>;
  success: string;
  failure: string;
  onSettled?: () => void;
}) {
  try {
    await action();
    toast.success(success);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : failure);
  } finally {
    onSettled?.();
  }
}

function SigningSecretSection({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const generateMut = useGenerateSigningSecret(slug);
  const clearMut = useClearSigningSecret(slug);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(
    null,
  );
  const [confirmClear, setConfirmClear] = React.useState(false);

  const handleGenerate = () =>
    runSecretMutation({
      action: async () => {
        const result = await generateMut.mutateAsync();
        setRevealedSecret(result.secret);
      },
      success: "Signing secret generated",
      failure: "Failed to generate the signing secret",
    });

  const handleClear = () =>
    runSecretMutation({
      action: () => clearMut.mutateAsync(),
      success: "Signing secret cleared",
      failure: "Failed to clear the signing secret",
      onSettled: () => setConfirmClear(false),
    });

  return (
    <SettingsSection
      id="signing-secret"
      title="Server-submit signing secret"
      description="Your backend signs each request with this secret, so the public submit endpoint can trust it without an Origin header. Required for server-to-server collection."
      footer={canManage ? undefined : READ_ONLY_TRUST_REASON}
    >
      {revealedSecret ? (
        <RevealPanel
          plaintext={revealedSecret}
          onDone={() => setRevealedSecret(null)}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60"
              aria-hidden
            >
              <KeyIcon
                className="size-3.5 text-muted-foreground"
                weight="bold"
              />
            </span>
            <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
              Generating creates a secret, and rotates it if one already exists
              — the previous value stops working immediately. Semblia shows the
              value once and never again.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClear(true)}
              disabled={
                !canManage || generateMut.isPending || clearMut.isPending
              }
            >
              Clear secret
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={
                !canManage || generateMut.isPending || clearMut.isPending
              }
              className="tactile"
            >
              {generateMut.isPending ? "Generating…" : "Generate secret"}
            </Button>
          </div>
        </div>
      )}

      {/* Destructive confirmation is modal with an explicit gate — never an
          inline second click that a mis-aimed pointer can complete. */}
      <ConfirmationDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        intent="danger"
        title="Clear the signing secret?"
        description="Server-to-server submits signed with it stop being accepted immediately. Browser submits from trusted origins are unaffected."
        cancelLabel="Keep secret"
        confirmLabel="Clear secret"
        onConfirm={handleClear}
      />
    </SettingsSection>
  );
}

export function TrustClient({ project }: { project: V2ProjectDTO }) {
  const canManage = canManageProject(project);

  return (
    <PageBody padding="bare">
      <div className="pb-8">
        <AllowedOriginsSection slug={project.slug} canManage={canManage} />
        <SigningSecretSection slug={project.slug} canManage={canManage} />
      </div>
    </PageBody>
  );
}
