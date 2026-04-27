"use client";

import * as React from "react";
import type { MockProject, MockApiKey, ApiKeyType } from "@/lib/mock-data";
import { PlusIcon, KeyIcon, EyeIcon, LockKeyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
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
  type ViewMode,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import { useApiKeys } from "@/hooks/use-api-keys";
import {
  ApiKeyRow,
  ApiKeyCard,
  ApiKeyListItemSkeleton,
  ApiKeyCardSkeleton,
} from "./api-key-list-item";
import { CreateKeyDialog } from "./create-key-dialog";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type StatusFilter = "all" | "active" | "revoked" | "expired";

/* ─── Section heading ─────────────────────────────────────────────────────── */

function SectionHead({
  title,
  description,
  onNew,
  newLabel,
}: {
  title: string;
  description: string;
  onNew: () => void;
  newLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-5 sm:px-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 text-xs"
        onClick={onNew}
      >
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        {newLabel}
      </Button>
    </div>
  );
}

/* ─── Empty state for a section ──────────────────────────────────────────── */

function SectionEmpty({
  type,
  onNew,
}: {
  type: ApiKeyType;
  onNew: () => void;
}) {
  const isPublishable = type === "publishable";
  return (
    <Empty className="border border-dashed py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isPublishable ? (
            <EyeIcon weight="bold" />
          ) : (
            <LockKeyIcon weight="bold" />
          )}
        </EmptyMedia>
        <EmptyTitle>
          No {isPublishable ? "publishable" : "secret"} keys yet
        </EmptyTitle>
        <EmptyDescription>
          {isPublishable
            ? "Safe to ship in browser code. Read-only. Locked to the origins you list."
            : "Server-side only. Never paste in client code. Treat like a database password."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" className="gap-1.5 text-xs" onClick={onNew}>
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          Create {isPublishable ? "publishable" : "secret"} key
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/* ─── Key list section ────────────────────────────────────────────────────── */

function KeySection({
  title,
  description,
  keys,
  slug,
  viewMode,
  filter,
  loading,
  type,
  onNew,
  onRevoke,
  onRotate,
}: {
  title: string;
  description: string;
  keys: MockApiKey[];
  slug: string;
  viewMode: ViewMode;
  filter: StatusFilter;
  loading: boolean;
  type: ApiKeyType;
  onNew: () => void;
  onRevoke: (keyId: string) => void;
  onRotate: (keyId: string) => void;
}) {
  const filtered = React.useMemo(() => {
    if (filter === "all") return keys;
    if (filter === "active")
      return keys.filter(
        (k) => k.isActive && (!k.expiresAt || k.expiresAt > new Date()),
      );
    if (filter === "revoked") return keys.filter((k) => !k.isActive);
    return keys.filter((k) => k.expiresAt != null && k.expiresAt <= new Date());
  }, [keys, filter]);

  return (
    <>
      <SectionHead
        title={title}
        description={description}
        onNew={onNew}
        newLabel={`New ${type} key`}
      />

      {loading ? (
        viewMode === "list" ? (
          <div className="divide-y divide-border">
            <ApiKeyListItemSkeleton />
            <ApiKeyListItemSkeleton />
          </div>
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            <ApiKeyCardSkeleton />
            <ApiKeyCardSkeleton />
          </div>
        )
      ) : keys.length === 0 ? (
        <div className="px-4 pb-4 sm:px-6">
          <SectionEmpty type={type} onNew={onNew} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No {type} keys match the current filter.
        </p>
      ) : viewMode === "list" ? (
        <div
          role="list"
          aria-label={`${title} keys`}
          className="divide-y divide-border"
        >
          {filtered.map((key) => (
            <ApiKeyRow
              key={key.id}
              entry={key}
              slug={slug}
              onRevoke={() => onRevoke(key.id)}
              onRotate={() => onRotate(key.id)}
            />
          ))}
        </div>
      ) : (
        <div
          role="list"
          aria-label={`${title} keys`}
          className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3"
        >
          {filtered.map((key) => (
            <div key={key.id} role="listitem">
              <ApiKeyCard
                entry={key}
                slug={slug}
                onRevoke={() => onRevoke(key.id)}
                onRotate={() => onRotate(key.id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Main client ─────────────────────────────────────────────────────────── */

export function ApiKeysClient({ project }: { project: MockProject }) {
  const { publishable, secret, loading, revoke, rotate } = useApiKeys(
    project.id,
  );

  const [viewMode, setViewMode] = useViewMode("api-keys:view", "list");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [createType, setCreateType] = React.useState<ApiKeyType | null>(null);

  const allKeys = [...publishable, ...secret];

  const counts = {
    all: allKeys.length,
    active: allKeys.filter(
      (k) => k.isActive && (!k.expiresAt || k.expiresAt > new Date()),
    ).length,
    revoked: allKeys.filter((k) => !k.isActive).length,
    expired: allKeys.filter(
      (k) => k.expiresAt != null && k.expiresAt <= new Date(),
    ).length,
  };

  const applySearch = React.useCallback(
    (keys: MockApiKey[]) => {
      if (!search.trim()) return keys;
      const q = search.trim().toLowerCase();
      return keys.filter(
        (k) =>
          k.name.toLowerCase().includes(q) ||
          k.keyPrefix.toLowerCase().includes(q),
      );
    },
    [search],
  );

  const showToolbar = !loading && allKeys.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="API Keys"
        description="Authenticate your widgets and server integrations."
        actions={
          showToolbar ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="shrink-0 gap-1.5 text-xs">
                  <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                  New key
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setCreateType("publishable")}>
                  <EyeIcon className="mr-2 size-3.5" />
                  Publishable key
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreateType("secret")}>
                  <LockKeyIcon className="mr-2 size-3.5" />
                  Secret key
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      {showToolbar && (
        <PageToolbar
          leading={
            <>
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search keys…"
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
        {!loading && allKeys.length === 0 ? (
          /* Global empty state — centered, inset */
          <div className="px-4 py-12 sm:px-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyIcon weight="bold" />
                </EmptyMedia>
                <EmptyTitle>No API keys yet</EmptyTitle>
                <EmptyDescription>
                  Create a publishable key to embed widgets, or a secret key to
                  manage your project via API.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setCreateType("publishable")}
                  >
                    <EyeIcon className="size-3.5" aria-hidden />
                    Publishable key
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setCreateType("secret")}
                  >
                    <LockKeyIcon className="size-3.5" aria-hidden />
                    Secret key
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <>
            <KeySection
              title="Publishable keys"
              description="Safe to embed in browser code. Read-only. Locked to the origins you list."
              keys={applySearch(publishable)}
              slug={project.slug}
              viewMode={viewMode}
              filter={filter}
              loading={loading}
              type="publishable"
              onNew={() => setCreateType("publishable")}
              onRevoke={(id) => revoke(id)}
              onRotate={(id) => rotate(id)}
            />

            <div className="border-t border-border/60">
              <KeySection
                title="Secret keys"
                description="Server-side only. Never paste in client code. Treat like a database password."
                keys={applySearch(secret)}
                slug={project.slug}
                viewMode={viewMode}
                filter={filter}
                loading={loading}
                type="secret"
                onNew={() => setCreateType("secret")}
                onRevoke={(id) => revoke(id)}
                onRotate={(id) => rotate(id)}
              />
            </div>
          </>
        )}
      </PageBody>

      <CreateKeyDialog
        open={createType != null}
        initialType={createType ?? "publishable"}
        projectId={project.id}
        onOpenChange={(open) => {
          if (!open) setCreateType(null);
        }}
      />
    </div>
  );
}
