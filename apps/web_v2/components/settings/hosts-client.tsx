"use client";

/**
 * HostsClient — Public surfaces panel.
 *
 * Reads the project's PublicSurfaceHost rows via `usePublicSurfaceHosts`.
 * Defaults seeded on project create are `<slug>.testimonials.semblia.com`
 * (COLLECTION) and `<slug>.walls.semblia.com` (WALL) — see
 * `apps/api_v2/src/modules/projects/projects.service.ts`.
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBody, SettingsSection } from "@/components/shared";
import { usePublicSurfaceHosts } from "@/hooks/api";

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

const STATUS_COPY: Record<
  V2PublicSurfaceHostStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  DISABLED: {
    label: "Disabled",
    className: "border-border bg-muted/40 text-muted-foreground",
  },
};

function HostCard({ host }: { host: V2PublicSurfaceHostDTO }) {
  const copy = FEATURE_COPY[host.feature] ?? {
    label: host.feature,
    description: "",
  };
  const status = STATUS_COPY[host.status];
  const publicHref = `https://${host.hostname}`;
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicHref);
      setCopied(true);
      toast.success("URL copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — check clipboard permissions");
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/50">
              <GlobeIcon
                className="size-3.5 text-muted-foreground"
                weight="bold"
                aria-hidden
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {copy.label}
                </p>
                {host.isDefault && (
                  <span className="rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Default
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {copy.description}
              </p>
            </div>
          </div>
          <p className="mt-3 truncate font-mono text-[12.5px] text-foreground">
            {host.hostname}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs"
          >
            {copied ? (
              <CheckCircleIcon className="size-3.5 text-emerald-500" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={host.status !== "ACTIVE"}
          >
            <a href={publicHref} target="_blank" rel="noreferrer noopener">
              Open
              <ArrowSquareOutIcon className="size-3" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HostsClient({ project }: { project: V2ProjectDTO }) {
  const hosts = usePublicSurfaceHosts(project.slug);
  const rows = hosts.data ?? [];

  return (
    <PageBody padding="default">
      <div className="space-y-8 pb-8">
        <SettingsSection
          id="hosted-surfaces"
          title="Hosted surfaces"
          description="Public URLs where this project's collection and wall pages are served."
        >
          {hosts.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
              No hosted surfaces yet. Default hosts are seeded when the project
              is created.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((host) => (
                <HostCard key={host.id} host={host} />
              ))}
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          id="custom-domain"
          title="Custom domain"
          description="Use your own domain (e.g. testimonials.yourcompany.com) for the public collection page."
        >
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Coming soon
            </span>
            <div className="text-[13px] leading-relaxed text-muted-foreground">
              Self-serve domain verification with automated TLS is on the launch
              roadmap. Reach out if you need it now and we&apos;ll set it up
              manually.
            </div>
          </div>
        </SettingsSection>
      </div>
    </PageBody>
  );
}
