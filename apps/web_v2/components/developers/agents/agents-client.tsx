"use client";

import * as React from "react";
import Link from "next/link";
import type { V2ApiKeyDTO } from "@workspace/types";
import { PlusIcon, RobotIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  PageBody,
  PageToolbar,
  ViewToggle,
  FilterPills,
  SearchField,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import { useAgentAccessOverview, useRevokeAgentKey } from "@/hooks/api";
import { DeveloperShell } from "@/components/developers/developer-shell";
import {
  AgentKeyRow,
  AgentKeyCard,
  AgentKeyListItemSkeleton,
  AgentKeyCardSkeleton,
} from "./agent-key-list-item";

type StatusFilter = "all" | "active" | "revoked" | "expired";

const MODULE_NOW = Date.now();

function isActive(key: V2ApiKeyDTO) {
  return key.status === "ACTIVE" && key.isActive;
}
function isExpired(key: V2ApiKeyDTO) {
  return (
    key.status === "EXPIRED" ||
    (key.expiresAt != null && new Date(key.expiresAt).getTime() < MODULE_NOW)
  );
}
function isRevoked(key: V2ApiKeyDTO) {
  return key.status === "REVOKED" || !key.isActive;
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

  const newHref = `/projects/${slug}/developers/agents/new`;
  const canCreate = presets.length > 0;

  const counts = {
    all: keys.length,
    active: keys.filter((k) => isActive(k) && !isExpired(k)).length,
    revoked: keys.filter(isRevoked).length,
    expired: keys.filter(isExpired).length,
  };

  const filtered = React.useMemo(() => {
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
  }, [keys, filter, search]);

  const showToolbar = !isLoading && keys.length > 0;

  const actions = showToolbar ? (
    <Button
      asChild
      size="sm"
      className="shrink-0 gap-1.5 text-xs"
      disabled={!canCreate}
    >
      <Link href={newHref}>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        New agent key
      </Link>
    </Button>
  ) : undefined;

  return (
    <DeveloperShell slug={slug} active="agents" actions={actions}>
      {showToolbar && (
        <PageToolbar
          leading={
            <>
              <SearchField
                value={search}
                onChange={setSearch}
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
                onChange={(v) => setFilter(v as StatusFilter)}
                aria-label="Filter by status"
              />
            </>
          }
          trailing={<ViewToggle value={viewMode} onChange={setViewMode} />}
        />
      )}

      <PageBody padding="bare" className="overflow-y-auto">
        {isLoading ? (
          viewMode === "list" ? (
            <div className="divide-y divide-border">
              <AgentKeyListItemSkeleton />
              <AgentKeyListItemSkeleton />
            </div>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
              <AgentKeyCardSkeleton />
              <AgentKeyCardSkeleton />
            </div>
          )
        ) : keys.length === 0 ? (
          <div className="px-4 py-12 sm:px-6">
            <Empty>
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
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={!canCreate}
                >
                  <Link href={newHref}>
                    <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                    Create agent key
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            No agent keys match the current filter.
          </p>
        ) : viewMode === "list" ? (
          <div
            role="list"
            aria-label="Agent keys"
            className="divide-y divide-border"
          >
            {filtered.map((key) => (
              <AgentKeyRow
                key={key.id}
                entry={key}
                presets={presets}
                slug={slug}
                onRevoke={() => revokeMutation.mutate(key.id)}
              />
            ))}
          </div>
        ) : (
          <div
            role="list"
            aria-label="Agent keys"
            className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3"
          >
            {filtered.map((key) => (
              <div key={key.id} role="listitem">
                <AgentKeyCard
                  entry={key}
                  presets={presets}
                  slug={slug}
                  onRevoke={() => revokeMutation.mutate(key.id)}
                />
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </DeveloperShell>
  );
}
