"use client";

/**
 * AgentsClient — the keys handed to AI agents and MCP adapters.
 *
 * This screen and `developers/keys` were the same screen twice, with the copies
 * drifted apart. They now share `components/developers/access-keys`: one row
 * anatomy, one lifecycle derivation, one state ladder, one confirmation gate.
 * What is genuinely different about agent keys stays here — they are cut from a
 * preset rather than from hand-picked scopes, and they are never rotated.
 *
 * Two defects fixed on the way through:
 *   • a failed overview request rendered the first-run empty state, telling an
 *     owner who has agent keys that they have none
 *   • the create button went `disabled` with no reason whenever presets were
 *     missing, which is also what the screen looked like while presets loaded
 */

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RobotIcon, PlusIcon } from "@phosphor-icons/react";
import type { V2ApiKeyDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  DataList,
  EmptyState,
  GhostList,
  NoResults,
  useDataState,
} from "@/components/shared";
import { agentKeyNewPath, agentKeyPath } from "@/lib/routes";
import { useAgentAccessOverview, useRevokeAgentKey } from "@/hooks/api";
import { KeyListShell, useKeyList } from "../access-keys/key-list-shell";
import { KeyRow } from "../access-keys/key-row";
import { presetLabel } from "./agent-presets";

const NO_PRESETS_REASON =
  "Agent presets aren't configured for this project, so there's no role to mint a key against.";

export function AgentsClient({ slug }: { slug: string }) {
  const query = useAgentAccessOverview(slug);
  const revokeMutation = useRevokeAgentKey(slug);

  const presets = React.useMemo(
    () => query.data?.presets ?? [],
    [query.data?.presets],
  );
  const entries = React.useMemo(
    () => query.data?.keys ?? [],
    [query.data?.keys],
  );

  const list = useKeyList(entries);
  const state = useDataState(query, {
    count: list.visible.length,
    filtered: list.isFiltered,
  });

  // Only meaningful once the overview has arrived: "no presets" and "presets
  // not loaded yet" must not look the same to the create control.
  const canCreate = query.data != null && presets.length > 0;
  const newHref = agentKeyNewPath(slug);

  const handleRevoke = (entry: V2ApiKeyDTO) => {
    revokeMutation.mutate(entry.id, {
      onSuccess: () => toast.success(`Revoked “${entry.name}”`),
      onError: () => toast.error("Couldn't revoke the agent key. Try again."),
    });
  };

  return (
    <KeyListShell
      title="Agent keys"
      resource="agent keys"
      state={state}
      list={list}
      searchPlaceholder="Search agent keys"
      actions={
        <NewAgentKeyButton
          newHref={newHref}
          canCreate={canCreate}
          loading={query.data == null}
        />
      }
      empty={<AgentKeysFirstRun newHref={newHref} canCreate={canCreate} />}
      filteredEmpty={
        <NoResults
          title={
            list.search
              ? `No agent key matches “${list.search}”`
              : "No agent keys in that state"
          }
          description="Search matches a key's name, prefix, and last four characters."
          action={
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={list.clear}
            >
              Show all agent keys
            </Button>
          }
        />
      }
    >
      {/* The agent-access endpoint returns every key in one response — there is
          no paginated envelope, so there is no pagination affordance to draw. */}
      <DataList aria-label="Agent keys">
        {list.visible.map((row) => (
          <KeyRow
            key={row.entry.id}
            row={row}
            icon={RobotIcon}
            kindLabel="agent key"
            descriptor={presetLabel(row.entry.scopes, presets)}
            detailHref={agentKeyPath(slug, row.entry.id)}
            busy={revokeMutation.isPending}
            onRevoke={() => handleRevoke(row.entry)}
          />
        ))}
      </DataList>
    </KeyListShell>
  );
}

/**
 * `disabled` on `<Button asChild>` lands on the `<a>`, which ignores it — the
 * control still navigates and still takes focus. When creation is genuinely
 * unavailable this renders a real disabled button, with the reason beside it
 * rather than in a tooltip a disabled control can never show.
 */
function NewAgentKeyButton({
  newHref,
  canCreate,
  loading,
}: {
  newHref: string;
  canCreate: boolean;
  loading: boolean;
}) {
  const reasonId = React.useId();

  if (!canCreate) {
    return (
      <span className="flex items-center gap-2">
        {!loading && (
          // Hidden below `sm` for room, but still the button's description:
          // `aria-describedby` reads referenced content even when it is not
          // displayed, which a `title` on a disabled control never is.
          <span
            id={reasonId}
            className="hidden max-w-[18rem] text-xs text-muted-foreground sm:block"
          >
            {NO_PRESETS_REASON}
          </span>
        )}
        <Button
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          disabled
          aria-describedby={loading ? undefined : reasonId}
        >
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          New agent key
        </Button>
      </span>
    );
  }

  return (
    <Button asChild size="sm" className="tactile shrink-0 gap-1.5 text-xs">
      <Link href={newHref}>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        New agent key
      </Link>
    </Button>
  );
}

function AgentKeysFirstRun({
  newHref,
  canCreate,
}: {
  newHref: string;
  canCreate: boolean;
}) {
  return (
    <EmptyState
      icon={RobotIcon}
      title="No agent keys"
      description="An agent key gives an AI agent or MCP adapter a scoped way into this project. Each one is cut from a preset role, so what the agent can reach is decided up front rather than per request."
      preview={<GhostList rows={3} leading="square" />}
      action={
        canCreate ? (
          <Button asChild size="sm" className="tactile gap-1.5 text-xs">
            <Link href={newHref}>
              <PlusIcon className="size-3.5" weight="bold" aria-hidden />
              Create agent key
            </Link>
          </Button>
        ) : (
          <div className="space-y-2">
            <Button size="sm" className="gap-1.5 text-xs" disabled>
              <PlusIcon className="size-3.5" weight="bold" aria-hidden />
              Create agent key
            </Button>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              {NO_PRESETS_REASON}
            </p>
          </div>
        )
      }
    />
  );
}
