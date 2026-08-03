"use client";

/**
 * WebhooksClient — endpoints and their delivery history.
 *
 * This surface already caught its query errors, but it caught them the way a
 * page does when each page owns its own ladder: `isLoading ? skeleton :
 * items.length === 0 ? empty : rows`, which renders "No endpoints yet" after a
 * 500. Both tabs now derive their state from `useDataState`, so error outranks
 * empty structurally and the retry copy matches every other surface.
 *
 * Also fixed here:
 *   • the active tab lives in the URL, so a refresh or a shared link reopens
 *     the view the reader was actually looking at
 *   • deliveries had a "Page 1 of 4" strip that never said how many deliveries
 *     existed; pagination now comes from the API's own envelope via `DataList`
 *   • a delivery's Retry is cross-checked against its endpoint's status, so it
 *     is never offered against a receiver the queue will refuse to send to
 *
 * Deliveries are a comparison task (status / attempts / timing down the
 * column) and would ideally be a `DataTable`. They are a `DataList` because
 * `DataTable` has no pagination slot and `DataList`'s is bound to its
 * `role="list"` container — rendering a table inside that container is an
 * `aria-required-children` violation, and duplicating `ListPagination` would
 * fork a shared primitive. The comparable fields are pinned to the row's
 * `metrics` slot in a fixed order instead. Recorded as a primitive gap.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  PlusIcon,
  WebhooksLogoIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";
import type {
  V2DeliveryStatus,
  V2OutboundWebhookDeliveryDTO,
  V2OutboundWebhookEndpointDTO,
  V2PaginatedResponse,
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
  PageHeader,
  PageBody,
  PageToolbar,
  PageTabs,
  FilterPills,
  DataState,
  DataList,
  ListSkeleton,
  EmptyState,
  NoResults,
  GhostList,
  RefreshingDataBadge,
  useDataState,
  type DataListPagination,
  type DataStateResult,
  type FilterPillOption,
} from "@/components/shared";
import { webhookNewPath } from "@/lib/routes";
import {
  useOutboundWebhookEndpoints,
  useOutboundWebhookDeliveries,
  useRotateOutboundWebhookSecret,
  useDisableOutboundWebhookEndpoint,
  useRevokeOutboundWebhookEndpoint,
  useRetryOutboundWebhookDelivery,
} from "@/hooks/api";
import { RevealStep } from "@/components/developers/shared/reveal-step";
import { fmtCount } from "@/lib/format";
import { WebhookEndpointRow } from "./webhook-endpoint-item";
import { WebhookDeliveryRow } from "./webhook-delivery-item";

const PAGE_SIZE = 20;

type Tab = "endpoints" | "deliveries";
type StatusFilter = "all" | V2DeliveryStatus;

const TABS: Tab[] = ["endpoints", "deliveries"];

const DELIVERY_FILTERS: FilterPillOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "SUCCEEDED", label: "Delivered" },
  { id: "DELIVERING", label: "Sending" },
  { id: "PENDING", label: "Queued" },
  { id: "FAILED", label: "Failed" },
];

// The active tab is a view of one resource, so it belongs in the URL: a
// refresh, a bookmark, and the back button all reproduce the same view.
function useViewTab(): [Tab, (next: Tab) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("view");
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "endpoints";

  const setTab = React.useCallback(
    (next: Tab) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next === "endpoints") sp.delete("view");
      else sp.set("view", next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return [tab, setTab];
}

/** The header's count line for the active tab; absent until its query answers. */
function headerDescription({
  tab,
  endpointCount,
  deliveryTotal,
}: {
  tab: Tab;
  endpointCount: number | null;
  deliveryTotal: number | undefined;
}): string | undefined {
  if (tab === "endpoints") {
    if (endpointCount === null) return undefined;
    return `${fmtCount(endpointCount)} ${endpointCount === 1 ? "endpoint" : "endpoints"}`;
  }
  if (deliveryTotal === undefined) return undefined;
  return `${fmtCount(deliveryTotal)} ${deliveryTotal === 1 ? "delivery" : "deliveries"} in this view`;
}

/**
 * Whether a delivery's endpoint can still receive. Unknown (endpoint list not
 * loaded, or an endpoint that no longer appears in the list) stays `null` —
 * blocking a retry on a guess is as wrong as offering one that will be
 * dropped.
 */
function endpointCanReceive(
  endpoints: V2OutboundWebhookEndpointDTO[] | undefined,
  endpointId: string,
): boolean | null {
  if (endpoints === undefined) return null;
  const endpoint = endpoints.find((e) => e.id === endpointId);
  return endpoint ? endpoint.status === "ACTIVE" : null;
}

/** Pagination for `DataList`, straight from the API's envelope once it answers. */
function deliveryPaginationFrom(
  data: V2PaginatedResponse<V2OutboundWebhookDeliveryDTO> | undefined,
  onPageChange: (page: number) => void,
  busy: boolean,
): DataListPagination | undefined {
  if (!data) return undefined;
  return {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages,
    onPageChange,
    busy,
  };
}

function WebhooksToolbar({
  tab,
  onTabChange,
  endpointCount,
  filter,
  onFilterChange,
}: {
  tab: Tab;
  onTabChange: (next: Tab) => void;
  /**
   * The count is a badge that disappears at zero — never a parenthesised
   * "(0)" next to the destination noun. `null` until the list has answered.
   */
  endpointCount: number | null;
  filter: StatusFilter;
  onFilterChange: (next: StatusFilter) => void;
}) {
  return (
    <PageToolbar
      leading={
        <PageTabs
          options={[
            {
              id: "endpoints",
              label: "Endpoints",
              icon: WebhooksLogoIcon,
              count: endpointCount,
            },
            {
              id: "deliveries",
              label: "Deliveries",
              icon: ListBulletsIcon,
            },
          ]}
          value={tab}
          onChange={onTabChange}
          aria-label="Webhook sections"
        />
      }
      trailing={
        tab === "deliveries" ? (
          <FilterPills
            options={DELIVERY_FILTERS}
            value={filter}
            onChange={onFilterChange}
            size="sm"
            aria-label="Filter deliveries by status"
          />
        ) : null
      }
    />
  );
}

interface EndpointsPanelProps {
  slug: string;
  state: DataStateResult;
  endpoints: V2OutboundWebhookEndpointDTO[];
  busy: boolean;
  onRotate: (endpointId: string) => void;
  onDisable: (endpointId: string) => void;
  onRevoke: (endpointId: string) => void;
  newButton: React.ReactNode;
}

function EndpointsPanel({
  slug,
  state,
  endpoints,
  busy,
  onRotate,
  onDisable,
  onRevoke,
  newButton,
}: EndpointsPanelProps) {
  return (
    <DataState
      state={state}
      resource="your webhook endpoints"
      skeleton={<ListSkeleton rows={3} leading="square" trailing />}
      empty={
        <EmptyState
          icon={WebhooksLogoIcon}
          title="No endpoints yet"
          description="Semblia POSTs signed event payloads to your URL as responses arrive, with retries."
          preview={<GhostList rows={3} leading="square" />}
          action={newButton}
        />
      }
    >
      {/* The endpoints route returns the project's complete set — there
          is no paginated envelope here, so no pagination affordance. */}
      <DataList aria-label="Webhook endpoints">
        {endpoints.map((endpoint) => (
          <WebhookEndpointRow
            key={endpoint.id}
            slug={slug}
            endpoint={endpoint}
            busy={busy}
            onRotate={onRotate}
            onDisable={onDisable}
            onRevoke={onRevoke}
          />
        ))}
      </DataList>
    </DataState>
  );
}

interface DeliveriesPanelProps {
  state: DataStateResult;
  deliveries: V2OutboundWebhookDeliveryDTO[];
  hasEndpoints: boolean;
  filter: StatusFilter;
  onClearFilter: () => void;
  pagination: DataListPagination | undefined;
  endpointActive: (endpointId: string) => boolean | null;
  onRetry: (deliveryId: string) => void;
  retryingId: string | undefined;
  newButton: React.ReactNode;
}

function DeliveriesPanel({
  state,
  deliveries,
  hasEndpoints,
  filter,
  onClearFilter,
  pagination,
  endpointActive,
  onRetry,
  retryingId,
  newButton,
}: DeliveriesPanelProps) {
  return (
    <DataState
      state={state}
      resource="webhook deliveries"
      skeleton={
        <ListSkeleton rows={5} leading="none" trailing density="default" />
      }
      empty={
        // Nothing has fired yet. With no endpoints that is a setup gap;
        // with endpoints it is simply quiet, and gets no CTA.
        hasEndpoints ? (
          <NoResults
            title="No deliveries yet"
            description="Nothing has fired to your endpoints so far. Attempts appear here as they happen, with their status and response."
          />
        ) : (
          <EmptyState
            icon={ListBulletsIcon}
            title="No deliveries yet"
            description="Delivery attempts appear here once an endpoint exists and events start firing."
            action={newButton}
          />
        )
      }
      filteredEmpty={
        <NoResults
          title={`No ${DELIVERY_FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? "matching"} deliveries`}
          description="No delivery in this project has that status right now."
          action={
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onClearFilter}
            >
              Show all deliveries
            </Button>
          }
        />
      }
    >
      <DataList aria-label="Webhook deliveries" pagination={pagination}>
        {deliveries.map((delivery) => (
          <WebhookDeliveryRow
            key={delivery.id}
            delivery={delivery}
            endpointActive={endpointActive(delivery.endpointId)}
            onRetry={onRetry}
            isRetrying={retryingId === delivery.id}
          />
        ))}
      </DataList>
    </DataState>
  );
}

function RotatedSecretDialog({
  secret,
  onClose,
}: {
  secret: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={secret != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signing secret rotated</DialogTitle>
          <DialogDescription>
            Update your receiver with the new secret. The previous one no longer
            validates.
          </DialogDescription>
        </DialogHeader>
        {secret != null && <RevealStep plaintext={secret} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

export function WebhooksClient({ slug }: { slug: string }) {
  const [tab, setTab] = useViewTab();
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
  const endpointBusy = [rotate, disable, revoke].some((m) => m.isPending);

  const endpoints = React.useMemo(
    () => endpointsQuery.data ?? [],
    [endpointsQuery.data],
  );
  const deliveries = React.useMemo(
    () => deliveriesQuery.data?.items ?? [],
    [deliveriesQuery.data],
  );

  const endpointsState = useDataState(endpointsQuery, {
    count: endpoints.length,
  });
  const deliveriesState = useDataState(deliveriesQuery, {
    count: deliveries.length,
    filtered: filter !== "all",
  });

  const endpointActive = React.useCallback(
    (endpointId: string) => endpointCanReceive(endpointsQuery.data, endpointId),
    [endpointsQuery.data],
  );

  // Reset delivery pagination whenever the active filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  function handleRotate(endpointId: string) {
    rotate.mutate(endpointId, {
      onSuccess: (endpoint) => setRevealSecret(endpoint.signingSecret),
      onError: () => toast.error("Couldn't rotate the signing secret."),
    });
  }

  function handleDisable(endpointId: string) {
    disable.mutate(endpointId, {
      onSuccess: () => toast.success("Endpoint disabled"),
      onError: () => toast.error("Couldn't disable the endpoint."),
    });
  }

  function handleRevoke(endpointId: string) {
    revoke.mutate(endpointId, {
      onSuccess: () => toast.success("Endpoint revoked"),
      onError: () => toast.error("Couldn't revoke the endpoint."),
    });
  }

  function handleRetry(deliveryId: string) {
    retry.mutate(deliveryId, {
      onSuccess: () => toast.success("Delivery re-queued"),
      onError: () => toast.error("Couldn't retry the delivery."),
    });
  }

  const newButton = (
    <Button asChild size="sm" className="gap-1.5 text-xs">
      <Link href={webhookNewPath(slug)}>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        New endpoint
      </Link>
    </Button>
  );

  const endpointCount = endpointsQuery.data ? endpoints.length : null;
  const activeState = tab === "endpoints" ? endpointsState : deliveriesState;

  return (
    <>
      <PageHeader
        title="Webhooks"
        description={headerDescription({
          tab,
          endpointCount,
          deliveryTotal: deliveriesQuery.data?.total,
        })}
        actions={
          <>
            <RefreshingDataBadge show={activeState.isRefreshing} />
            {tab === "endpoints" ? newButton : null}
          </>
        }
      />
      <WebhooksToolbar
        tab={tab}
        onTabChange={setTab}
        endpointCount={endpointCount}
        filter={filter}
        onFilterChange={setFilter}
      />

      <PageBody padding="bare" className="overflow-y-auto">
        {tab === "endpoints" ? (
          <EndpointsPanel
            slug={slug}
            state={endpointsState}
            endpoints={endpoints}
            busy={endpointBusy}
            onRotate={handleRotate}
            onDisable={handleDisable}
            onRevoke={handleRevoke}
            newButton={newButton}
          />
        ) : (
          <DeliveriesPanel
            state={deliveriesState}
            deliveries={deliveries}
            hasEndpoints={endpoints.length > 0}
            filter={filter}
            onClearFilter={() => setFilter("all")}
            pagination={deliveryPaginationFrom(
              deliveriesQuery.data,
              setPage,
              deliveriesQuery.isFetching,
            )}
            endpointActive={endpointActive}
            onRetry={handleRetry}
            retryingId={retry.isPending ? retry.variables : undefined}
            newButton={newButton}
          />
        )}
      </PageBody>

      <RotatedSecretDialog
        secret={revealSecret}
        onClose={() => setRevealSecret(null)}
      />
    </>
  );
}
