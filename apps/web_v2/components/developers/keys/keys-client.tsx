"use client";

import * as React from "react";
import Link from "next/link";
import type { V2ApiKeyDTO } from "@workspace/types";
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
import { developerKeyNewPath } from "@/lib/routes";
import { useViewMode } from "@/hooks/use-view-mode";
import { useApiKeysList, useRevokeApiKey, useRotateApiKey } from "@/hooks/api";
import {
  ApiKeyRow,
  ApiKeyCard,
  ApiKeyListItemSkeleton,
  ApiKeyCardSkeleton,
} from "./key-list-item";

type ApiKeyType = "PUBLISHABLE" | "SECRET";
type StatusFilter = "all" | "active" | "revoked" | "expired";

function newKeyHref(slug: string, type: ApiKeyType) {
  return `${developerKeyNewPath(slug)}?type=${type}`;
}

function SectionHead({
  title,
  newHref,
  newLabel,
}: {
  title: string;
  newHref: string;
  newLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-5 sm:px-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 text-xs"
      >
        <Link href={newHref}>
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          {newLabel}
        </Link>
      </Button>
    </div>
  );
}

function SectionEmpty({ type, slug }: { type: ApiKeyType; slug: string }) {
  const isPublishable = type === "PUBLISHABLE";
  return (
    <Empty className="border border-dashed py-10">
      <EmptyPreview>
        <GhostList rows={3} leading="square" />
      </EmptyPreview>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isPublishable ? (
            <EyeIcon weight="bold" />
          ) : (
            <LockKeyIcon weight="bold" />
          )}
        </EmptyMedia>
        <EmptyTitle>
          No {isPublishable ? "publishable" : "secret"} keys
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="sm" className="gap-1.5 text-xs">
          <Link href={newKeyHref(slug, type)}>
            <PlusIcon className="size-3.5" weight="bold" aria-hidden />
            New {isPublishable ? "publishable" : "secret"} key
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** Page-header action: pick which kind of key to create. */
function NewKeyMenu({ slug }: { slug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="shrink-0 gap-1.5 text-xs">
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          New key
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={newKeyHref(slug, "PUBLISHABLE")}>
            <EyeIcon className="mr-2 size-3.5" />
            Publishable key
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={newKeyHref(slug, "SECRET")}>
            <LockKeyIcon className="mr-2 size-3.5" />
            Secret key
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Whole-page empty state shown when the project has no keys at all. */
function KeysEmptyState({ slug }: { slug: string }) {
  return (
    <div className="px-4 py-12 sm:px-6">
      <Empty>
        <EmptyPreview>
          <GhostList rows={3} leading="square" />
        </EmptyPreview>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyIcon weight="bold" />
          </EmptyMedia>
          <EmptyTitle>No API keys</EmptyTitle>
          <EmptyDescription>Pick a key type to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Link href={newKeyHref(slug, "PUBLISHABLE")}>
                <EyeIcon className="size-3.5" aria-hidden />
                Publishable
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 text-xs">
              <Link href={newKeyHref(slug, "SECRET")}>
                <LockKeyIcon className="size-3.5" aria-hidden />
                Secret
              </Link>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}

const MODULE_NOW = Date.now();

function isKeyActive(key: V2ApiKeyDTO): boolean {
  return key.status === "ACTIVE" && key.isActive;
}

function isKeyExpired(key: V2ApiKeyDTO): boolean {
  return (
    key.status === "EXPIRED" ||
    (key.expiresAt != null && new Date(key.expiresAt).getTime() < MODULE_NOW)
  );
}

function isKeyRevoked(key: V2ApiKeyDTO): boolean {
  return key.status === "REVOKED" || !key.isActive;
}

/** Per-status totals rendered as the filter-pill counts. */
type StatusCounts = Record<StatusFilter, number>;

function countKeysByStatus(keys: V2ApiKeyDTO[]): StatusCounts {
  return {
    all: keys.length,
    active: keys.filter((k) => isKeyActive(k) && !isKeyExpired(k)).length,
    revoked: keys.filter((k) => isKeyRevoked(k)).length,
    expired: keys.filter((k) => isKeyExpired(k)).length,
  };
}

/** Search + status filter + list/grid toggle row. */
function KeysToolbar({
  search,
  onSearchChange,
  counts,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  counts: StatusCounts;
  filter: StatusFilter;
  onFilterChange: (value: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <PageToolbar
      leading={
        <>
          <SearchField
            value={search}
            onChange={onSearchChange}
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
            onChange={(v) => onFilterChange(v as StatusFilter)}
            aria-label="Filter by status"
          />
        </>
      }
      trailing={<ViewToggle value={viewMode} onChange={onViewModeChange} />}
    />
  );
}

function KeySection({
  title,
  keys,
  slug,
  viewMode,
  filter,
  loading,
  type,
  onRevoke,
  onRotate,
}: {
  title: string;
  keys: V2ApiKeyDTO[];
  slug: string;
  viewMode: ViewMode;
  filter: StatusFilter;
  loading: boolean;
  type: ApiKeyType;
  onRevoke: (keyId: string) => void;
  onRotate: (keyId: string) => void;
}) {
  const filtered = React.useMemo(() => {
    if (filter === "all") return keys;
    if (filter === "active")
      return keys.filter((k) => isKeyActive(k) && !isKeyExpired(k));
    if (filter === "revoked") return keys.filter((k) => isKeyRevoked(k));
    return keys.filter((k) => isKeyExpired(k));
  }, [keys, filter]);

  return (
    <>
      <SectionHead
        title={title}
        newHref={newKeyHref(slug, type)}
        newLabel={`New ${type.toLowerCase()} key`}
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
          <SectionEmpty type={type} slug={slug} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No {type.toLowerCase()} keys match the current filter.
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

/** The publishable + secret sections stacked in their fixed order. */
function KeyTypeSections({
  publishable,
  secret,
  slug,
  viewMode,
  filter,
  loading,
  onRevoke,
  onRotate,
}: {
  publishable: V2ApiKeyDTO[];
  secret: V2ApiKeyDTO[];
  slug: string;
  viewMode: ViewMode;
  filter: StatusFilter;
  loading: boolean;
  onRevoke: (keyId: string) => void;
  onRotate: (keyId: string) => void;
}) {
  return (
    <>
      <KeySection
        title="Publishable"
        keys={publishable}
        slug={slug}
        viewMode={viewMode}
        filter={filter}
        loading={loading}
        type="PUBLISHABLE"
        onRevoke={onRevoke}
        onRotate={onRotate}
      />

      <div className="border-t border-border/60">
        <KeySection
          title="Secret"
          keys={secret}
          slug={slug}
          viewMode={viewMode}
          filter={filter}
          loading={loading}
          type="SECRET"
          onRevoke={onRevoke}
          onRotate={onRotate}
        />
      </div>
    </>
  );
}

export function KeysClient({ slug }: { slug: string }) {
  const { data: allKeys = [], isLoading: loading } = useApiKeysList(slug);
  const revokeMutation = useRevokeApiKey(slug);
  const rotateMutation = useRotateApiKey(slug);

  const [viewMode, setViewMode] = useViewMode("developer-keys:view", "list");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");

  const publishable = React.useMemo(
    () => allKeys.filter((k) => k.keyType === "PUBLISHABLE"),
    [allKeys],
  );
  const secret = React.useMemo(
    () => allKeys.filter((k) => k.keyType === "SECRET"),
    [allKeys],
  );

  const counts = countKeysByStatus(allKeys);

  const applySearch = React.useCallback(
    (keys: V2ApiKeyDTO[]) => {
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
    <>
      <PageHeader
        title="API keys"
        actions={showToolbar ? <NewKeyMenu slug={slug} /> : undefined}
      />
      {showToolbar && (
        <KeysToolbar
          search={search}
          onSearchChange={setSearch}
          counts={counts}
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      <PageBody padding="bare" className="overflow-y-auto">
        {!loading && allKeys.length === 0 ? (
          <KeysEmptyState slug={slug} />
        ) : (
          <KeyTypeSections
            publishable={applySearch(publishable)}
            secret={applySearch(secret)}
            slug={slug}
            viewMode={viewMode}
            filter={filter}
            loading={loading}
            onRevoke={(id) => revokeMutation.mutate(id)}
            onRotate={(id) => rotateMutation.mutate(id)}
          />
        )}
      </PageBody>
    </>
  );
}
