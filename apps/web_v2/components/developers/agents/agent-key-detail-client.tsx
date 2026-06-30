"use client";

import * as React from "react";
import Link from "next/link";
import { fmtNum, fmtRelative } from "@/lib/format";
import type { V2ApiKeyDTO, V2AgentAccessPresetDTO } from "@workspace/types";
import {
  ProhibitIcon,
  ClockIcon,
  ShieldCheckIcon,
  RobotIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
  PageTabs,
} from "@/components/shared";
import {
  useAgentAccessOverview,
  useRevokeAgentKey,
  useAgentActions,
} from "@/hooks/api";
import { findMatchingPreset } from "./agent-key-list-item";

type Tab = "overview" | "actions";

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PresetCard({ preset }: { preset: V2AgentAccessPresetDTO | null }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon
            className={cn(
              "size-3.5",
              preset ? "text-brand" : "text-muted-foreground",
            )}
            weight={preset ? "fill" : "bold"}
            aria-hidden
          />
          <p className="text-sm font-semibold text-foreground">
            {preset ? preset.label : "Custom"}
          </p>
        </div>
        {preset && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {preset.scopes.length} scopes
          </span>
        )}
      </div>
      {preset && (
        <p className="mt-1 text-xs text-muted-foreground">
          {preset.description}
        </p>
      )}
    </div>
  );
}

function ScopesList({ scopes }: { scopes: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Allowed scopes
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {scopes.map((scope) => (
          <li
            key={scope}
            className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 font-mono text-[11px] text-foreground"
          >
            {scope}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverviewTab({
  entry,
  preset,
}: {
  entry: V2ApiKeyDTO;
  preset: V2AgentAccessPresetDTO | null;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Calls" value={fmtNum(entry.usageCount)} />
        <KpiCard label="Scopes" value={entry.scopes.length} />
        <KpiCard label="Rate limit" value={`${entry.rateLimit}/m`} />
        <KpiCard
          label="Last used"
          value={
            entry.lastUsedAt ? fmtRelative(new Date(entry.lastUsedAt)) : "—"
          }
        />
      </div>

      <PresetCard preset={preset} />
      <ScopesList scopes={entry.scopes} />
    </div>
  );
}

function ActionsTab({ slug, keyId }: { slug: string; keyId: string }) {
  const { data: actions = [], isLoading } = useAgentActions(slug);
  const scoped = React.useMemo(
    () => actions.filter((a) => a.apiKeyId === keyId),
    [actions, keyId],
  );

  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full animate-shimmer" />
        ))}
      </div>
    );
  }

  if (scoped.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClockIcon weight="bold" />
          </EmptyMedia>
          <EmptyTitle>No actions yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">When</TableHead>
          <TableHead className="text-xs">Event</TableHead>
          <TableHead className="text-xs">Requests</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scoped.map((ev) => (
          <TableRow key={ev.id}>
            <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
              {fmtRelative(new Date(ev.occurredAt))}
            </TableCell>
            <TableCell>
              <span className="text-xs font-medium text-foreground">
                {ev.type}
              </span>
            </TableCell>
            <TableCell className="font-mono text-[11px] tabular-nums">
              {fmtNum(ev.requestCount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AgentKeyDetailClient({
  slug,
  keyId,
}: {
  slug: string;
  keyId: string;
}) {
  const { data: overview, isLoading } = useAgentAccessOverview(slug);
  const revokeMutation = useRevokeAgentKey(slug);

  const presets = React.useMemo(
    () => overview?.presets ?? [],
    [overview?.presets],
  );
  const key = React.useMemo(
    () => overview?.keys.find((k) => k.id === keyId) ?? null,
    [overview, keyId],
  );
  const matchedPreset = React.useMemo(
    () => (key ? findMatchingPreset(key.scopes, presets) : null),
    [key, presets],
  );

  const [tab, setTab] = React.useState<Tab>("overview");
  const [revokeOpen, setRevokeOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader
          title={<Skeleton className="h-5 w-40 animate-shimmer" />}
          description={<Skeleton className="h-3.5 w-56 animate-shimmer" />}
        />
        <PageBody padding="default" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-20 w-full animate-shimmer rounded-lg"
              />
            ))}
          </div>
        </PageBody>
      </div>
    );
  }

  if (!key) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Agent key not found" />
        <PageBody padding="default">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RobotIcon weight="bold" />
              </EmptyMedia>
              <EmptyTitle>Not in this project</EmptyTitle>
              <EmptyDescription>
                Revoked, deleted, or in a different project.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href={`/projects/${slug}/developers/agents`}>
                  Back to agents
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </PageBody>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={key.name}
        description={
          <span className="font-mono text-[11px]">
            {key.keyPrefix}••••{key.lastFour ?? "****"}
          </span>
        }
        actions={
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={!key.isActive}
            onClick={() => setRevokeOpen(true)}
          >
            <ProhibitIcon className="size-3.5" aria-hidden />
            Revoke
          </Button>
        }
      />

      <PageToolbar
        leading={
          <PageTabs<Tab>
            options={[
              { id: "overview", label: "Overview" },
              { id: "actions", label: "Actions" },
            ]}
            value={tab}
            onChange={setTab}
            aria-label="Agent key detail tabs"
          />
        }
      />

      <PageBody padding="default" className="overflow-y-auto">
        {tab === "overview" && (
          <OverviewTab entry={key} preset={matchedPreset} />
        )}
        {tab === "actions" && <ActionsTab slug={slug} keyId={keyId} />}
      </PageBody>

      <ConfirmationDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        intent="danger"
        title={<>Revoke &ldquo;{key.name}&rdquo;?</>}
        description="This agent key stops working immediately. You can't undo it."
        cancelLabel="Keep key"
        confirmLabel="Revoke key"
        onConfirm={() => revokeMutation.mutate(keyId)}
      />
    </div>
  );
}
