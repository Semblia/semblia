"use client";

import * as React from "react";
import Link from "next/link";
import type { V2ApiKeyDTO, V2AgentAccessPresetDTO } from "@workspace/types";
import { PlusIcon, RobotIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyPreview,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  PageHeader,
  PageBody,
  PageToolbar,
  ViewToggle,
  FilterPills,
  SearchField,
  GhostList,
  type ViewMode,
} from "@/components/shared";
import { agentKeyNewPath } from "@/lib/routes";
import { useViewMode } from "@/hooks/use-view-mode";
import { useAgentAccessOverview, useRevokeAgentKey } from "@/hooks/api";
import {
  AgentKeyRow,
  AgentKeyCard,
  AgentKeyListItemSkeleton,
  AgentKeyCardSkeleton,
} from "./agent-key-list-item";

type StatusFilter = "all" | "active" | "revoked" | "expired";

function isActive(key: V2ApiKeyDTO) {
  return key.status === "ACTIVE" && key.isActive;
}
// Read the clock per call, not once at module load: a module-level timestamp
// is frozen for the life of the tab, so a key that lapses mid-session would
// never move into Expired.
function isExpired(key: V2ApiKeyDTO) {
  return (
    key.status === "EXPIRED" ||
    (key.expiresAt != null && new Date(key.expiresAt).getTime() < Date.now())
  );
}
function isRevoked(key: V2ApiKeyDTO) {
  return key.status === "REVOKED" || !key.isActive;
}

/* ─── Filtering ──────────────────────────────────────────────────────────── */

/** Per-status totals shown as counts on the filter pills. */
function countByStatus(keys: V2ApiKeyDTO[]) {
  return {
    all: keys.length,
    active: keys.filter((k) => isActive(k) && !isExpired(k)).length,
    revoked: keys.filter(isRevoked).length,
    expired: keys.filter(isExpired).length,
  };
}

/** Applies the status filter, then the free-text name/prefix search. */
function filterKeys(
  keys: V2ApiKeyDTO[],
  filter: StatusFilter,
  search: string,
): V2ApiKeyDTO[] {
  let list = keys;
  if (filter === "active")
    list = list.filter((k) => isActive(k) && !isExpired(k));
  else if (filter === "revoked") list = list.filter(isRevoked);
  else if (filter === "expired") list = list.filter(isExpired);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.keyPrefix.toLowerCase().includes(q),
    );
  }
  return list;
}

/* ─── Toolbar ────────────────────────────────────────────────────────────── */

/** Search + status pills + list/grid toggle strip above the key list. */
function AgentKeysToolbar({
  keys,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: {
  keys: V2ApiKeyDTO[];
  search: string;
  onSearchChange: (value: string) => void;
  filter: StatusFilter;
  onFilterChange: (value: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const counts = countByStatus(keys);
  return (
    <PageToolbar
      leading={
        <>
          <SearchField
            value={search}
            onChange={onSearchChange}
            placeholder="Search agent keys…"
            className="w-48 shrink-0"
          />
          <FilterPills
            options={[
              { id: "all", label: "All", count: counts.all },
              { id: "active", label: "Active", count: counts.active },
              { id: "revoked", label: "Revoked", count: counts.revoked },
              { id: "expired", label: "Expired", count: counts.expired },
            ]}
            value={filter}
            onChange={(v) => onFilterChange(v as StatusFilter)}
            aria-label="Filter by status"
          />
        </>
      }
      trailing={<ViewToggle value={viewMode} onChange={onViewModeChange} />}
    />
  );
}

/* ─── Body states ────────────────────────────────────────────────────────── */

/** Skeleton placeholders while the agent-access overview loads. */
function AgentKeysLoading({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="divide-y divide-border">
        <AgentKeyListItemSkeleton />
        <AgentKeyListItemSkeleton />
      </div>
    );
  }
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
      <AgentKeyCardSkeleton />
      <AgentKeyCardSkeleton />
    </div>
  );
}

/**
 * "New agent key" CTA.
 *
 * `disabled` on a `Button asChild` lands on the `<a>`, which ignores it — the
 * control still navigates and still takes focus. When creation is unavailable
 * we render a real disabled button instead of a link.
 */
function NewAgentKeyButton({
  newHref,
  canCreate,
  label,
  className,
}: {
  newHref: string;
  canCreate: boolean;
  label: string;
  className?: string;
}) {
  const content = (
    <>
      <PlusIcon className="size-3.5" weight="bold" aria-hidden />
      {label}
    </>
  );

  if (!canCreate) {
    return (
      <Button size="sm" className={className} disabled>
        {content}
      </Button>
    );
  }

  return (
    <Button asChild size="sm" className={className}>
      <Link href={newHref}>{content}</Link>
    </Button>
  );
}

/** First-run state when the project has never minted an agent key. */
function AgentKeysEmpty({
  newHref,
  canCreate,
}: {
  newHref: string;
  canCreate: boolean;
}) {
  return (
    <div className="px-4 py-12 sm:px-6">
      <Empty>
        <EmptyPreview>
          <GhostList rows={3} leading="square" />
        </EmptyPreview>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RobotIcon weight="bold" />
          </EmptyMedia>
          <EmptyTitle>No agent keys</EmptyTitle>
          <EmptyDescription>
            Mint a scoped key for an AI agent or MCP adapter.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <NewAgentKeyButton
            newHref={newHref}
            canCreate={canCreate}
            label="Create agent key"
            className="gap-1.5 text-xs"
          />
        </EmptyContent>
      </Empty>
    </div>
  );
}

/** The matching keys, rendered as rows or as a card grid. */
function AgentKeysList({
  entries,
  presets,
  slug,
  viewMode,
  onRevoke,
}: {
  entries: V2ApiKeyDTO[];
  presets: V2AgentAccessPresetDTO[];
  slug: string;
  viewMode: ViewMode;
  onRevoke: (keyId: string) => void;
}) {
  if (viewMode === "list") {
    return (
      <div
        role="list"
        aria-label="Agent keys"
        className="divide-y divide-border"
      >
        {entries.map((key) => (
          <AgentKeyRow
            key={key.id}
            entry={key}
            presets={presets}
            slug={slug}
            isExpired={isExpired(key)}
            onRevoke={() => onRevoke(key.id)}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      role="list"
      aria-label="Agent keys"
      className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3"
    >
      {entries.map((key) => (
        <div key={key.id} role="listitem">
          <AgentKeyCard
            entry={key}
            presets={presets}
            slug={slug}
            isExpired={isExpired(key)}
            onRevoke={() => onRevoke(key.id)}
          />
        </div>
      ))}
    </div>
  );
}

/** Picks the loading / empty / no-match / list state for the page body. */
function AgentKeysBody({
  isLoading,
  keys,
  filtered,
  presets,
  slug,
  viewMode,
  newHref,
  canCreate,
  onRevoke,
}: {
  isLoading: boolean;
  keys: V2ApiKeyDTO[];
  filtered: V2ApiKeyDTO[];
  presets: V2AgentAccessPresetDTO[];
  slug: string;
  viewMode: ViewMode;
  newHref: string;
  canCreate: boolean;
  onRevoke: (keyId: string) => void;
}) {
  if (isLoading) return <AgentKeysLoading viewMode={viewMode} />;
  if (keys.length === 0)
    return <AgentKeysEmpty newHref={newHref} canCreate={canCreate} />;
  if (filtered.length === 0)
    return (
      <p className="py-10 text-center text-xs text-muted-foreground">
        No agent keys match the current filter.
      </p>
    );
  return (
    <AgentKeysList
      entries={filtered}
      presets={presets}
      slug={slug}
      viewMode={viewMode}
      onRevoke={onRevoke}
    />
  );
}

export function AgentsClient({ slug }: { slug: string }) {
  const { data: overview, isLoading } = useAgentAccessOverview(slug);
  const revokeMutation = useRevokeAgentKey(slug);

  const presets = React.useMemo(
    () => overview?.presets ?? [],
    [overview?.presets],
  );
  const keys = React.useMemo(() => overview?.keys ?? [], [overview?.keys]);

  const [viewMode, setViewMode] = useViewMode("developer-agents:view", "list");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");

  const newHref = agentKeyNewPath(slug);
  const canCreate = presets.length > 0;

  const filtered = React.useMemo(
    () => filterKeys(keys, filter, search),
    [keys, filter, search],
  );

  const showToolbar = !isLoading && keys.length > 0;

  const actions = showToolbar ? (
    <NewAgentKeyButton
      newHref={newHref}
      canCreate={canCreate}
      label="New agent key"
      className="shrink-0 gap-1.5 text-xs"
    />
  ) : undefined;

  return (
    <>
      <PageHeader title="Agent keys" actions={actions} />
      {showToolbar && (
        <AgentKeysToolbar
          keys={keys}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      <PageBody padding="bare" className="overflow-y-auto">
        <AgentKeysBody
          isLoading={isLoading}
          keys={keys}
          filtered={filtered}
          presets={presets}
          slug={slug}
          viewMode={viewMode}
          newHref={newHref}
          canCreate={canCreate}
          onRevoke={(keyId) => revokeMutation.mutate(keyId)}
        />
      </PageBody>
    </>
  );
}
