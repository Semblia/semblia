"use client";

/**
 * HostsClient — the public addresses this project is served on.
 *
 * Reads `PublicSurfaceHost` rows via `usePublicSurfaceHosts`. Defaults seeded on
 * project create are `<slug>.testimonials.semblia.com` (COLLECTION) and
 * `<slug>.walls.semblia.com` (WALL) — see
 * `apps/api_v2/src/modules/projects/projects.service.ts`.
 *
 * What this pass changed:
 *   • every host was a `rounded-lg border` card inside `SettingsSection`, which
 *     is already the card. Hosts are hairline-divided rows now.
 *   • the state ladder was `isLoading ? skeleton : rows.length === 0 ? "no
 *     hosted surfaces yet" : rows`, so a failed request told the owner their
 *     project had no public address. `DataState` makes that unrepresentable.
 *   • "Open" was `<Button asChild disabled>`, and `disabled` does nothing to an
 *     anchor — an unverified host was still one click from a dead page. A host
 *     that isn't ACTIVE now renders an inert control with the reason in place.
 *   • DNS status is a lifecycle, so it reads as a `StatusDot` that animates
 *     only while verification is genuinely outstanding, and never as the raw
 *     `PENDING_VERIFICATION` enum.
 *
 * The endpoint returns every host for the project in one array — there is no
 * paginated envelope to render an affordance from.
 */

import * as React from "react";
import { toast } from "sonner";
import type {
  V2ProjectDTO,
  V2PublicSurfaceHostDTO,
  V2PublicSurfaceFeature,
  V2PublicSurfaceHostStatus,
} from "@workspace/types";
import {
  GlobeIcon,
  CopyIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DataState,
  DataList,
  ListSkeleton,
  EmptyState,
  ItemRow,
  PageBody,
  SettingsSection,
  StatusBadge,
  StatusDot,
  useDataState,
  type StatusMeta,
} from "@/components/shared";
import { usePublicSurfaceHosts } from "@/hooks/api";
import { fmtDateTime, humanizeLabel, timeAgo } from "@/lib/format";

const FEATURE_COPY: Record<
  V2PublicSurfaceFeature,
  { label: string; description: string }
> = {
  COLLECTION: {
    label: "Collection page",
    description: "Public form where customers leave testimonials.",
  },
  WALL: {
    label: "Testimonial wall",
    description: "Public wall that surfaces approved testimonials.",
  },
};

/**
 * The host lifecycle, in the app's one status vocabulary. `transitional` is
 * true only while verification is genuinely outstanding — a dot that always
 * pulses says nothing. An enum this build doesn't know degrades to a readable
 * label and is treated as not-yet-live, because guessing permissively would
 * invite a click into a page that doesn't resolve.
 *
 * `components/shared/status-badge.tsx` carries registries for review, publish,
 * moderation, and import enums but none for public-surface hosts; this map is
 * the local stand-in.
 */
const HOST_STATUS: Record<
  V2PublicSurfaceHostStatus,
  StatusMeta & { transitional: boolean; live: boolean }
> = {
  ACTIVE: { label: "Live", tone: "positive", transitional: false, live: true },
  PENDING_VERIFICATION: {
    label: "Verifying DNS",
    tone: "progress",
    transitional: true,
    live: false,
  },
  DISABLED: {
    label: "Disabled",
    tone: "muted",
    transitional: false,
    live: false,
  },
};

function hostStatusMeta(value: string) {
  return (
    HOST_STATUS[value as V2PublicSurfaceHostStatus] ?? {
      label: humanizeLabel(value.toLowerCase()),
      tone: "muted" as const,
      transitional: false,
      live: false,
    }
  );
}

const NOT_LIVE_REASON: Record<string, string> = {
  PENDING_VERIFICATION:
    "This address goes live once its DNS records finish verifying.",
  DISABLED: "This address is switched off, so it won't resolve.",
};

function HostRow({ host }: { host: V2PublicSurfaceHostDTO }) {
  const copy = FEATURE_COPY[host.feature] ?? {
    label: humanizeLabel(host.feature.toLowerCase()),
    description: "",
  };
  const status = hostStatusMeta(host.status);
  const publicHref = `https://${host.hostname}`;
  const [copied, setCopied] = React.useState(false);

  const openReason = status.live
    ? null
    : (NOT_LIVE_REASON[host.status] ??
      "This address isn't serving traffic yet.");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicHref);
      setCopied(true);
      toast.success("URL copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the URL — check clipboard permissions");
    }
  }

  return (
    <ItemRow
      // `DataList` renders `role="list"`; a row without `listitem` is not an
      // item to assistive technology, and its `aria-label` goes unexposed.
      role="listitem"
      padding="dense"
      // `ItemShell` shape="row" hard-codes its own bottom hairline, which would
      // double up with the `divide-y` DataList already draws.
      className="border-b-0"
      aria-label={copy.label}
      leading={
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60"
          aria-hidden
        >
          <GlobeIcon className="size-3.5 text-muted-foreground" weight="bold" />
        </span>
      }
      title={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-foreground">
            {copy.label}
          </span>
          {host.isDefault && (
            <span className="text-xs text-muted-foreground">Default</span>
          )}
        </span>
      }
      subtitle={
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-mono text-xs text-foreground">
            {host.hostname}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
        </div>
      }
      trailing={
        <StatusDot
          label={status.label}
          tone={status.tone}
          transitional={status.transitional}
          // A dot alone conveys no duration: verified hosts carry when they
          // went live, so "Live" is anchored to a moment.
          since={
            host.verifiedAt ? (
              <span title={fmtDateTime(host.verifiedAt)}>
                {timeAgo(host.verifiedAt)}
              </span>
            ) : undefined
          }
        />
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            {copied ? (
              <CheckCircleIcon className="size-3.5" aria-hidden />
            ) : (
              <CopyIcon className="size-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Copy URL"}
          </Button>

          {openReason ? (
            <span className="inline-flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="h-7 gap-1.5 px-2 text-xs"
              >
                Open page
                <ArrowSquareOutIcon className="size-3" aria-hidden />
              </Button>
              {/* The reason sits in the flow, not in a tooltip on a disabled
                  control that receives no pointer or focus events. */}
              <span className="text-xs text-muted-foreground">
                {openReason}
              </span>
            </span>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <a href={publicHref} target="_blank" rel="noreferrer noopener">
                Open page
                <ArrowSquareOutIcon className="size-3" aria-hidden />
              </a>
            </Button>
          )}
        </div>
      }
    />
  );
}

export function HostsClient({ project }: { project: V2ProjectDTO }) {
  const hostsQuery = usePublicSurfaceHosts(project.slug);
  const hosts = React.useMemo(() => hostsQuery.data ?? [], [hostsQuery.data]);
  const hostsState = useDataState(hostsQuery, { count: hosts.length });

  const liveCount = hosts.filter((h) => h.status === "ACTIVE").length;

  return (
    <PageBody padding="default">
      <div className="space-y-8 pb-8">
        <SettingsSection
          id="hosted-surfaces"
          title="Hosted surfaces"
          description="Public URLs where this project's collection and wall pages are served."
          flush
          actions={
            hostsState.kind === "ready" ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {liveCount} of {hosts.length} live
              </span>
            ) : undefined
          }
        >
          <DataState
            state={hostsState}
            resource="this project's public addresses"
            align="start"
            className="px-4 py-2"
            skeleton={
              <ListSkeleton
                rows={2}
                leading="square"
                trailing
                density="dense"
                className="-mx-4 -my-2"
              />
            }
            empty={
              <EmptyState
                icon={GlobeIcon}
                align="start"
                title="No public addresses yet"
                description="Semblia seeds a collection address and a wall address when a project is created. If neither is here, contact support and quote this project's slug."
              />
            }
          >
            {/* Rows bleed back to the card edge so the hairlines run the full
                width, while the empty and error surfaces keep the card's inset. */}
            <DataList aria-label="Public addresses" className="-mx-4 -my-2">
              {hosts.map((host) => (
                <HostRow key={host.id} host={host} />
              ))}
            </DataList>
          </DataState>
        </SettingsSection>

        <SettingsSection
          id="custom-domain"
          title="Custom domain"
          description="Serve the public collection page from your own domain, such as testimonials.yourcompany.com."
          actions={<StatusBadge label="Not available yet" tone="neutral" />}
        >
          {/* No control here at all: an inactive button explained by a tooltip
              would be worse than saying plainly what exists today. */}
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            Self-serve domain verification with automated TLS is on the launch
            roadmap. Until it ships, support can point a domain you already own
            at this project manually — the hosted addresses above keep working
            either way.
          </p>
        </SettingsSection>
      </div>
    </PageBody>
  );
}
