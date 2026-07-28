"use client";

/**
 * KeyDetailClient — one API key, end to end.
 *
 * The screen this replaces had five hand-rolled bordered surfaces (four KPI
 * tiles, a chart card, a sticky save box, a danger-zone box) plus a tab strip
 * hiding two of them, and its "Trend" tile rendered a bare ↑ or ↓ arrow with
 * nothing naming what had gone up. Everything now sits on the page background,
 * grouped by `Section`, with the one editable region in the one sanctioned
 * container for a form fieldset.
 *
 * The record itself comes from the project's key list rather than a per-key
 * endpoint, so "this id isn't in the list" is a not-found — and because
 * `useDataState` derives that from the query, a failed list request renders an
 * error instead of claiming the key was deleted.
 */

import * as React from "react";
import { toast } from "sonner";
import type { V2ApiKeyDTO } from "@workspace/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataState,
  FilterPills,
  ListSkeleton,
  Section,
  SectionStack,
  SettingsFooter,
  SettingsSection,
  useDataState,
} from "@/components/shared";
import { humanizeLabel } from "@/lib/format";
import { developerKeysPath } from "@/lib/routes";
import {
  useApiKeyEvents,
  useApiKeysList,
  useRevokeApiKey,
  useRotateApiKey,
  useUpdateApiKey,
} from "@/hooks/api";
import { KeyLifecycleActions } from "../access-keys/key-actions";
import {
  ACTIVITY_ANCHOR,
  KeyDetailLayout,
  KeyFacts,
  KeyScopes,
  SCOPES_ANCHOR,
} from "../access-keys/key-detail-shell";
import { buildUsageSeries, describeKey } from "../access-keys/key-model";
import { KeyActivityTable, KeyUsageChart } from "../access-keys/key-usage";
import { RotatedKeyDialog } from "../access-keys/rotated-key-dialog";
import { useNow } from "../access-keys/use-now";

/** Server-side rate tiers. A key on some other value keeps it, unrounded. */
const RATE_PRESETS = [10, 60, 600, 3000] as const;

export function KeyDetailClient({
  slug,
  keyId,
}: {
  slug: string;
  keyId: string;
}) {
  const now = useNow();
  const keysQuery = useApiKeysList(slug);
  const eventsQuery = useApiKeyEvents(slug, keyId);
  const revokeMutation = useRevokeApiKey(slug);
  const rotateMutation = useRotateApiKey(slug);

  const entry = React.useMemo(
    () => keysQuery.data?.find((key) => key.id === keyId) ?? null,
    [keysQuery.data, keyId],
  );
  const row = React.useMemo(
    () => (entry ? { entry, state: describeKey(entry, now) } : null),
    [entry, now],
  );

  // `count` is 1 or 0 for a single record: the list loaded and this id was
  // either in it or it wasn't, which is a not-found rather than an empty list.
  const state = useDataState(keysQuery, { count: entry ? 1 : 0 });

  const events = React.useMemo(
    () => eventsQuery.data ?? [],
    [eventsQuery.data],
  );
  const usageState = useDataState(eventsQuery, { count: events.length });
  const points = React.useMemo(
    () => (entry ? buildUsageSeries(events, entry, now) : []),
    [events, entry, now],
  );

  const settings = useKeySettings(slug, entry);
  const [rotated, setRotated] = React.useState<string | null>(null);
  const busy = revokeMutation.isPending || rotateMutation.isPending;

  const handleRevoke = () => {
    revokeMutation.mutate(keyId, {
      onSuccess: () => toast.success("Key revoked"),
      onError: () => toast.error("Couldn't revoke the key. Try again."),
    });
  };

  const handleRotate = () => {
    rotateMutation.mutate(keyId, {
      onSuccess: (result) => {
        const secret = result.secret ?? result.key ?? null;
        if (secret) {
          setRotated(secret);
          return;
        }
        toast.warning(
          "The key was rotated but Semblia didn't receive the new secret. Rotate it again to get one you can copy.",
        );
      },
      onError: () => toast.error("Couldn't rotate the key. Try again."),
    });
  };

  return (
    <>
      <KeyDetailLayout
        row={row}
        state={state}
        resource="this API key"
        fallbackTitle="API key"
        backHref={developerKeysPath(slug)}
        backLabel="Back to API keys"
        actions={
          row ? (
            <KeyLifecycleActions
              state={row.state}
              keyName={row.entry.name}
              busy={busy}
              onRotate={handleRotate}
              onRevoke={handleRevoke}
            />
          ) : undefined
        }
        footer={
          settings.dirty ? (
            <SettingsFooter
              dirty={settings.dirty}
              saving={settings.saving}
              canSave={settings.canSave}
              onSave={settings.save}
              onDiscard={settings.discard}
            />
          ) : undefined
        }
      >
        {row && (
          <SectionStack>
            <Section
              title="Usage"
              description="Counted from the moment the key was issued. A key that has never authenticated a request reads as never used, not as zero."
            >
              <KeyFacts
                row={row}
                extra={[{ term: "Type", value: keyTypeLabel(row.entry) }]}
              />
            </Section>

            <Section
              id={ACTIVITY_ANCHOR}
              title="Requests per day"
              description="Days with no requests are drawn as zero rather than skipped, so a quiet week reads as a quiet week."
              divided
            >
              <DataState
                state={usageState}
                resource="this key's usage"
                align="start"
                compactError
                skeleton={
                  <div className="space-y-4">
                    <Skeleton className="animate-shimmer h-44 w-full rounded-lg" />
                    <ListSkeleton
                      rows={3}
                      leading="none"
                      trailing
                      density="dense"
                    />
                  </div>
                }
                empty={
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    No requests yet. Once something authenticates with this key,
                    each day it was used shows up here.
                  </p>
                }
              >
                <div className="space-y-6">
                  <KeyUsageChart points={points} />
                  <KeyActivityTable events={events} />
                </div>
              </DataState>
            </Section>

            <Section
              id={SCOPES_ANCHOR}
              title="Scopes"
              description="Exactly what this key may reach. Scopes are fixed when a key is issued — to change them, create a replacement and revoke this one."
              divided
            >
              <KeyScopes scopes={row.entry.scopes} />
            </Section>

            <SettingsSection
              id="key-settings"
              title="Key settings"
              description="Renaming a key doesn't change its secret. The rate limit applies across every request this key makes."
            >
              <div className="space-y-1.5">
                <Label htmlFor="key-settings-name">Name</Label>
                <Input
                  id="key-settings-name"
                  value={settings.name}
                  onChange={(event) => settings.setName(event.target.value)}
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-settings-rate">Rate limit</Label>
                <FilterPills
                  options={rateOptions(row.entry.rateLimit)}
                  value={String(settings.rateLimit)}
                  onChange={(value) => settings.setRateLimit(Number(value))}
                  aria-label="Rate limit"
                />
                <p
                  id="key-settings-rate-hint"
                  className="text-xs text-muted-foreground"
                >
                  Requests above the limit are refused for the rest of the
                  minute.
                </p>
              </div>
            </SettingsSection>
          </SectionStack>
        )}
      </KeyDetailLayout>

      <RotatedKeyDialog
        plaintext={rotated}
        onDismiss={() => {
          setRotated(null);
          rotateMutation.reset();
        }}
      />
    </>
  );
}

function keyTypeLabel(entry: V2ApiKeyDTO): string {
  if (entry.keyType === "PUBLISHABLE") return "Publishable";
  if (entry.keyType === "SECRET") return "Secret";
  // A key type the app doesn't know still reads as words, never as its enum.
  return humanizeLabel(entry.keyType);
}

/**
 * The preset tiers, plus the key's own value when the server has it on
 * something bespoke — the slider this replaces silently snapped such a key up
 * to the next tier the moment the page rendered.
 */
function rateOptions(current: number) {
  const values = RATE_PRESETS.includes(current as (typeof RATE_PRESETS)[number])
    ? [...RATE_PRESETS]
    : [...RATE_PRESETS, current].sort((a, b) => a - b);
  return values.map((value) => ({
    id: String(value),
    label: `${value}/min`,
  }));
}

interface KeySettings {
  name: string;
  setName: (value: string) => void;
  rateLimit: number;
  setRateLimit: (value: number) => void;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  save: () => void;
  discard: () => void;
}

function useKeySettings(slug: string, entry: V2ApiKeyDTO | null): KeySettings {
  const updateKey = useUpdateApiKey(slug);
  const [name, setName] = React.useState("");
  const [rateLimit, setRateLimit] = React.useState(0);

  const entryId = entry?.id ?? null;
  const entryName = entry?.name ?? "";
  const entryRate = entry?.rateLimit ?? 0;

  // Seeded from the record, and re-seeded only when the *server's* values
  // change. A refetch that returns the same values leaves an in-progress edit
  // alone, because the dependencies are the values themselves, not the object.
  React.useEffect(() => {
    if (entryId == null) return;
    setName(entryName);
    setRateLimit(entryRate);
  }, [entryId, entryName, entryRate]);

  const trimmed = name.trim();
  const dirty =
    entryId != null && (trimmed !== entryName || rateLimit !== entryRate);

  const save = () => {
    if (!entry || !dirty || trimmed.length === 0) return;
    updateKey.mutate(
      {
        keyId: entry.id,
        body: { name: trimmed, rateLimit },
        // The update route only accepts SECRET or AGENT; a publishable key is
        // stored on the secret path, which is the existing server contract.
        keyType: entry.keyType === "AGENT" ? "AGENT" : "SECRET",
      },
      {
        onSuccess: () => toast.success("Key updated"),
        onError: () =>
          toast.error("Couldn't save the key. Nothing was changed."),
      },
    );
  };

  return {
    name,
    setName,
    rateLimit,
    setRateLimit,
    dirty,
    canSave: dirty && trimmed.length > 0 && !updateKey.isPending,
    saving: updateKey.isPending,
    save,
    discard: () => {
      setName(entryName);
      setRateLimit(entryRate);
    },
  };
}
