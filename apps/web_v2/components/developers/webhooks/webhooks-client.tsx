"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PlusIcon,
  WebhooksLogoIcon,
  ListBulletsIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import type {
  V2DeliveryStatus,
  V2OutboundWebhookEndpointDTO,
  V2OutboundWebhookDeliveryDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  PageTabs,
  FilterPills,
  type FilterPillOption,
} from "@/components/shared";
import {
  useOutboundWebhookEndpoints,
  useOutboundWebhookDeliveries,
  useRotateOutboundWebhookSecret,
  useDisableOutboundWebhookEndpoint,
  useRevokeOutboundWebhookEndpoint,
  useRetryOutboundWebhookDelivery,
} from "@/hooks/api";
import { RevealStep } from "@/components/developers/shared/reveal-step";
import { DeveloperShell } from "@/components/developers/developer-shell";
import {
  WebhookEndpointRow,
  WebhookEndpointRowSkeleton,
} from "./webhook-endpoint-item";
import {
  WebhookDeliveryRow,
  WebhookDeliveryRowSkeleton,
} from "./webhook-delivery-item";

const PAGE_SIZE = 20;

type Tab = "endpoints" | "deliveries";
type StatusFilter = "all" | V2DeliveryStatus;

const DELIVERY_FILTERS: FilterPillOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "SUCCEEDED", label: "Delivered" },
  { id: "DELIVERING", label: "Sending" },
  { id: "PENDING", label: "Queued" },
  { id: "FAILED", label: "Failed" },
];

export function WebhooksClient({ slug }: { slug: string }) {
  const [tab, setTab] = React.useState<Tab>("endpoints");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);
  const [revealSecret, setRevealSecret] = React.useState<string | null>(null);

  const endpointsQuery = useOutboundWebhookEndpoints(slug);
  const deliveriesQuery = useOutboundWebhookDeliveries(slug, {
    page,
    pageSize: PAGE_SIZE,
    status: filter === "all" ? undefined : filter,
  });

  const rotate = useRotateOutboundWebhookSecret(slug);
  const disable = useDisableOutboundWebhookEndpoint(slug);
  const revoke = useRevokeOutboundWebhookEndpoint(slug);
  const retry = useRetryOutboundWebhookDelivery(slug);

  const endpoints = endpointsQuery.data ?? [];
  const deliveries = deliveriesQuery.data?.items ?? [];

  // Reset delivery pagination whenever the active filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  function handleRotate(endpointId: string) {
    rotate.mutate(endpointId, {
      onSuccess: (endpoint) => setRevealSecret(endpoint.signingSecret),
      onError: () => toast.error("Could not rotate the signing secret."),
    });
  }

  function handleDisable(endpointId: string) {
    disable.mutate(endpointId, {
      onSuccess: () => toast.success("Endpoint disabled."),
      onError: () => toast.error("Could not disable the endpoint."),
    });
  }

  function handleRevoke(endpointId: string) {
    revoke.mutate(endpointId, {
      onSuccess: () => toast.success("Endpoint revoked."),
      onError: () => toast.error("Could not revoke the endpoint."),
    });
  }

  function handleRetry(deliveryId: string) {
    retry.mutate(deliveryId, {
      onSuccess: () => toast.success("Delivery re-queued."),
      onError: () => toast.error("Could not retry the delivery."),
    });
  }

  const newButton = (
    <Button asChild size="sm" className="gap-1.5 text-xs">
      <Link href={`/projects/${slug}/developers/webhooks/new`}>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        New endpoint
      </Link>
    </Button>
  );

  return (
    <DeveloperShell
      slug={slug}
      active="webhooks"
      actions={tab === "endpoints" ? newButton : undefined}
    >
      <PageToolbar
        contained
        leading={
          <PageTabs
            options={[
              {
                id: "endpoints",
                label: "Endpoints",
                icon: WebhooksLogoIcon,
                count: endpoints.length,
              },
              {
                id: "deliveries",
                label: "Deliveries",
                icon: ListBulletsIcon,
              },
            ]}
            value={tab}
            onChange={setTab}
            aria-label="Webhook sections"
          />
        }
        trailing={
          tab === "deliveries" ? (
            <FilterPills
              options={DELIVERY_FILTERS}
              value={filter}
              onChange={setFilter}
              size="sm"
              aria-label="Filter deliveries by status"
            />
          ) : null
        }
      />

      <PageBody contained padding="bare" className="overflow-y-auto">
        {tab === "endpoints" ? (
          <EndpointsPanel
            slug={slug}
            loading={endpointsQuery.isLoading}
            endpoints={endpoints}
            onRotate={handleRotate}
            onDisable={handleDisable}
            onRevoke={handleRevoke}
          />
        ) : (
          <DeliveriesPanel
            loading={deliveriesQuery.isLoading}
            deliveries={deliveries}
            filter={filter}
            page={page}
            totalPages={deliveriesQuery.data?.totalPages ?? 1}
            hasPrev={deliveriesQuery.data?.hasPrev ?? false}
            hasNext={deliveriesQuery.data?.hasNext ?? false}
            onPageChange={setPage}
            onRetry={handleRetry}
            retryingId={retry.isPending ? (retry.variables ?? null) : null}
          />
        )}
      </PageBody>

      <Dialog
        open={revealSecret != null}
        onOpenChange={(open) => {
          if (!open) setRevealSecret(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signing secret rotated</DialogTitle>
            <DialogDescription>
              Update your receiver with the new secret. The previous one no
              longer validates.
            </DialogDescription>
          </DialogHeader>
          {revealSecret != null && (
            <RevealStep
              plaintext={revealSecret}
              onClose={() => setRevealSecret(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DeveloperShell>
  );
}

/* ─── Endpoints panel ─────────────────────────────────────────────────────── */

function EndpointsPanel({
  slug,
  loading,
  endpoints,
  onRotate,
  onDisable,
  onRevoke,
}: {
  slug: string;
  loading: boolean;
  endpoints: V2OutboundWebhookEndpointDTO[];
  onRotate: (id: string) => void;
  onDisable: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        <WebhookEndpointRowSkeleton />
        <WebhookEndpointRowSkeleton />
        <WebhookEndpointRowSkeleton />
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WebhooksLogoIcon weight="bold" />
            </EmptyMedia>
            <EmptyTitle>No endpoints yet</EmptyTitle>
            <EmptyDescription>
              Register an HTTP endpoint to receive signed event payloads as
              responses come in.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm" className="gap-1.5 text-xs">
              <Link href={`/projects/${slug}/developers/webhooks/new`}>
                <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                New endpoint
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Webhook endpoints"
      className="divide-y divide-border"
    >
      {endpoints.map((endpoint) => (
        <div key={endpoint.id} role="listitem">
          <WebhookEndpointRow
            slug={slug}
            endpoint={endpoint}
            onRotate={onRotate}
            onDisable={onDisable}
            onRevoke={onRevoke}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Deliveries panel ────────────────────────────────────────────────────── */

function DeliveriesPanel({
  loading,
  deliveries,
  filter,
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPageChange,
  onRetry,
  retryingId,
}: {
  loading: boolean;
  deliveries: V2OutboundWebhookDeliveryDTO[];
  filter: StatusFilter;
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageChange: (updater: (p: number) => number) => void;
  onRetry: (deliveryId: string) => void;
  retryingId: string | null;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        <WebhookDeliveryRowSkeleton />
        <WebhookDeliveryRowSkeleton />
        <WebhookDeliveryRowSkeleton />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListBulletsIcon weight="bold" />
            </EmptyMedia>
            <EmptyTitle>
              {filter === "all"
                ? "No deliveries yet"
                : "No deliveries match this filter"}
            </EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? "Delivery attempts appear here once events start firing to your endpoints."
                : "Try a different status filter to see other deliveries."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div
        role="list"
        aria-label="Webhook deliveries"
        className="divide-y divide-border"
      >
        {deliveries.map((delivery) => (
          <div key={delivery.id} role="listitem">
            <WebhookDeliveryRow
              delivery={delivery}
              onRetry={onRetry}
              isRetrying={retryingId === delivery.id}
            />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
            >
              <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onPageChange((p) => p + 1)}
              disabled={!hasNext}
            >
              Next
              <ArrowRightIcon className="size-3.5" weight="bold" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
