"use client";

/**
 * CreateAgentKeyForm — mint a key against a preset role.
 *
 * Agent keys never carry hand-picked scopes: an operator hands a key to
 * something that acts on its own, so what it may reach is a decision made once,
 * from a named role. That is the only real difference from the API-key form,
 * and it is the only thing this file still owns — the two-step frame, the
 * one-time reveal, the leave guard, and the error copy are shared.
 *
 * Fixed here: the preset picker used to render an empty radio group while the
 * presets were still loading, and a *failed* preset request rendered "No
 * presets available" — telling the operator their project is misconfigured when
 * the request simply didn't arrive.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2AgentAccessPresetId } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { DataState, SettingsSection, useDataState } from "@/components/shared";
import { agentKeysPath } from "@/lib/routes";
import { useAgentAccessOverview, useCreateAgentKey } from "@/hooks/api";
import { ConfirmCloseDialog } from "@/components/developers/shared/reveal-step";
import {
  CreateKeyError,
  CreateKeyLayout,
  CreatedKeySecret,
  createKeyErrorMessage,
} from "../access-keys/create-key-shell";

const MIN_NAME = 3;

export function CreateAgentKeyForm({ slug }: { slug: string }) {
  const router = useRouter();
  const overviewQuery = useAgentAccessOverview(slug);
  const createMutation = useCreateAgentKey(slug);

  const presets = React.useMemo(
    () => overviewQuery.data?.presets ?? [],
    [overviewQuery.data?.presets],
  );
  const presetState = useDataState(overviewQuery, { count: presets.length });

  const [name, setName] = React.useState("");
  const [preset, setPreset] = React.useState<V2AgentAccessPresetId | null>(
    null,
  );
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [secretMissing, setSecretMissing] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const backHref = agentKeysPath(slug);
  const trimmedName = name.trim();
  const valid = trimmedName.length >= MIN_NAME && preset != null;

  async function handleSubmit() {
    if (!preset) return;
    setSecretMissing(false);
    try {
      const result = await createMutation.mutateAsync({
        name: trimmedName,
        preset,
      });
      const secret = result.secret ?? result.key ?? null;
      if (!secret) {
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
    createMutation.reset();
    router.push(backHref);
  }

  if (plaintext != null) {
    return (
      <>
        <CreateKeyLayout
          title="Agent key created"
          meta="Step 2 of 2 · shown once"
          backLabel="Back to agent keys"
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
      title="New agent key"
      meta="Step 1 of 2 · scoped to a preset role"
      backLabel="Back to agent keys"
      onBack={attemptLeave}
    >
      <DataState
        state={presetState}
        resource="agent presets"
        align="start"
        skeleton={<PresetSkeleton />}
        empty={
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            Agent presets aren&apos;t configured for this project, so there is
            no role to mint a key against. Nothing here is broken — this project
            simply has no agent roles defined yet.
          </p>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !createMutation.isPending) handleSubmit();
          }}
          className="space-y-6"
        >
          <SettingsSection
            id="agent-key-basics"
            title="Identity and role"
            description="The role fixes what the agent may reach — it can't be widened later."
          >
            <div className="space-y-1.5">
              <Label htmlFor="agent-key-name">
                Name{" "}
                <span aria-hidden className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="agent-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Claude support bot"
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>
                Preset{" "}
                <span aria-hidden className="text-destructive">
                  *
                </span>
              </Label>
              {/* Radix radio group: arrow keys, Home/End, and roving focus come
                  with it, which the hand-rolled card grid never had. */}
              <RadioGroup
                value={preset ?? ""}
                onValueChange={(value) =>
                  setPreset(value as V2AgentAccessPresetId)
                }
                aria-label="Preset role"
                className="gap-0 divide-y divide-border/50"
              >
                {presets.map((option) => {
                  const id = `preset-${option.id}`;
                  const labelId = `${id}-label`;
                  return (
                    <label
                      key={option.id}
                      htmlFor={id}
                      className="-mx-2 flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2.5 transition-colors duration-(--duration-base) hover:bg-muted/25"
                    >
                      <RadioGroupItem
                        id={id}
                        value={option.id}
                        aria-labelledby={labelId}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          id={labelId}
                          className="block text-xs font-medium text-foreground"
                        >
                          {option.label}
                        </span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">
                          {option.description}
                        </span>
                        <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground/80">
                          {option.scopes.length}{" "}
                          {option.scopes.length === 1 ? "scope" : "scopes"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          </SettingsSection>

          <CreateKeyError
            message={
              secretMissing
                ? "The agent key was created, but Semblia didn't receive the secret to show you. Revoke it from the agent key list and create another."
                : createMutation.error
                  ? createKeyErrorMessage(createMutation.error, "agent keys")
                  : null
            }
          />

          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {!valid && (
              <p className="mr-auto text-xs text-muted-foreground">
                {trimmedName.length < MIN_NAME
                  ? `Give the key a name of at least ${MIN_NAME} characters.`
                  : "Pick the role this agent should act with."}
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
              {createMutation.isPending ? "Creating…" : "Create agent key"}
            </Button>
          </div>
        </form>
      </DataState>
    </CreateKeyLayout>
  );
}

/** Matches the fieldset it stands in for: name field, then the role list. */
function PresetSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="animate-shimmer h-3 w-16" />
        <Skeleton className="animate-shimmer h-9 w-full" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Skeleton className="animate-shimmer size-4 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="animate-shimmer h-3 w-28" />
              <Skeleton className="animate-shimmer h-2.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
