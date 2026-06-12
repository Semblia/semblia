"use client";

import * as React from "react";
import Link from "next/link";
import {
  KeyIcon,
  RobotIcon,
  WebhooksLogoIcon,
  ExportIcon,
  PlugsConnectedIcon,
  ClockCounterClockwiseIcon,
  BookOpenTextIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";
import { PageBody } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApiKeysList,
  useAgentAccessOverview,
  useOutboundWebhookEndpoints,
  useExportDeliveries,
  useProjectActionAudit,
  useIntegrationConnections,
} from "@/hooks/api";
import { DeveloperShell } from "./developer-shell";

const EXTERNAL_DOCS_URL = "https://docs.semblia.com";

interface InternalCardSpec {
  kind: "internal";
  href: string;
  icon: PhosphorIcon;
  title: string;
  count: number | null;
  countLabel: string;
}

interface ExternalCardSpec {
  kind: "external";
  href: string;
  icon: PhosphorIcon;
  title: string;
  caption: string;
}

function OverviewCard({ spec }: { spec: InternalCardSpec | ExternalCardSpec }) {
  const Icon = spec.icon;
  const baseCls = cn(
    "group flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
    "transition-colors hover:border-brand/40 hover:bg-muted/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
  );

  const head = (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50">
        <Icon className="size-3.5 text-muted-foreground" weight="bold" />
      </span>
      <p className="flex-1 truncate text-sm font-semibold text-foreground">
        {spec.title}
      </p>
      {spec.kind === "external" ? (
        <ArrowSquareOutIcon
          className="size-3 text-muted-foreground/70"
          weight="bold"
          aria-hidden
        />
      ) : (
        <ArrowRightIcon
          className="size-3 text-muted-foreground transition-colors group-hover:text-foreground"
          weight="bold"
          aria-hidden
        />
      )}
    </div>
  );

  if (spec.kind === "external") {
    return (
      <a
        href={spec.href}
        target="_blank"
        rel="noreferrer noopener"
        className={baseCls}
      >
        {head}
        <p className="font-mono text-[11px] text-muted-foreground">
          {spec.caption}
        </p>
      </a>
    );
  }

  return (
    <Link href={spec.href} className={baseCls}>
      {head}
      <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
        {spec.count == null ? (
          <Skeleton className="h-6 w-10 animate-shimmer" />
        ) : (
          <span className="text-xl font-semibold text-foreground">
            {fmtNum(spec.count)}
          </span>
        )}
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {spec.countLabel}
        </span>
      </div>
    </Link>
  );
}

export function DeveloperOverviewClient({ slug }: { slug: string }) {
  const { data: keys, isLoading: keysLoading } = useApiKeysList(slug);
  const { data: agentOverview, isLoading: agentsLoading } =
    useAgentAccessOverview(slug);
  const { data: exports, isLoading: exportsLoading } = useExportDeliveries(
    slug,
    { pageSize: 1 },
  );
  const { data: webhookEndpoints, isLoading: webhooksLoading } =
    useOutboundWebhookEndpoints(slug);
  const { data: audit, isLoading: auditLoading } = useProjectActionAudit(slug, {
    pageSize: 1,
  });
  const { data: integrations, isLoading: integrationsLoading } =
    useIntegrationConnections(slug);

  const activeKeys =
    keys?.filter((k) => k.isActive && k.status === "ACTIVE").length ?? null;
  const activeAgents =
    agentOverview?.keys.filter((k) => k.isActive && k.status === "ACTIVE")
      .length ?? null;
  const exportCount = exports?.total ?? null;
  const activeWebhooks =
    webhookEndpoints?.filter((e) => e.status === "ACTIVE").length ?? null;
  const auditCount = audit?.total ?? null;
  const activeIntegrations =
    integrations?.filter((c) => c.status === "ACTIVE").length ?? null;

  const cards: (InternalCardSpec | ExternalCardSpec)[] = [
    {
      kind: "internal",
      href: `/projects/${slug}/developers/keys`,
      icon: KeyIcon,
      title: "API keys",
      count: keysLoading ? null : (activeKeys ?? 0),
      countLabel: "active",
    },
    {
      kind: "internal",
      href: `/projects/${slug}/developers/agents`,
      icon: RobotIcon,
      title: "Agent keys",
      count: agentsLoading ? null : (activeAgents ?? 0),
      countLabel: "active",
    },
    {
      kind: "internal",
      href: `/projects/${slug}/developers/webhooks`,
      icon: WebhooksLogoIcon,
      title: "Webhooks",
      count: webhooksLoading ? null : (activeWebhooks ?? 0),
      countLabel: "active",
    },
    {
      kind: "internal",
      href: `/projects/${slug}/developers/exports`,
      icon: ExportIcon,
      title: "Exports",
      count: exportsLoading ? null : (exportCount ?? 0),
      countLabel: "total",
    },
    {
      kind: "internal",
      href: `/projects/${slug}/developers/integrations`,
      icon: PlugsConnectedIcon,
      title: "Integrations",
      count: integrationsLoading ? null : (activeIntegrations ?? 0),
      countLabel: "active",
    },
    {
      kind: "internal",
      href: `/projects/${slug}/developers/audit`,
      icon: ClockCounterClockwiseIcon,
      title: "Activity",
      count: auditLoading ? null : (auditCount ?? 0),
      countLabel: "events",
    },
    {
      kind: "external",
      href: EXTERNAL_DOCS_URL,
      icon: BookOpenTextIcon,
      title: "Docs",
      caption: "docs.semblia.com",
    },
  ];

  return (
    <DeveloperShell slug={slug} active="overview">
      <PageBody padding="default" className="overflow-y-auto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <OverviewCard key={c.href} spec={c} />
          ))}
        </div>
      </PageBody>
    </DeveloperShell>
  );
}
