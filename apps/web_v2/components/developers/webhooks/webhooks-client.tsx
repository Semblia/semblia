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
import type { V2DeliveryStatus } from "@workspace/types";
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

export function WebhooksClient({ slug }: { slug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The active tab is a view of one resource, so it belongs in the URL: a
  // refresh, a bookmark, and the back button all reproduce the same view.
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
  const endpointBusy =
    rotate.isPending || disable.isPending || revoke.isPending;

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

  /**
   * Whether a delivery's endpoint can still receive. Unknown (endpoint list not
   * loaded, or an endpoint that no longer appears in the list) stays `null` —
   * blocking a retry on a guess is as wrong as offering one that will be
   * dropped.
   */
  const endpointActive = React.useCallback(
    (endpointId: string): boolean | null => {
      if (endpointsQuery.data === undefined) return null;
      const endpoint = endpoints.find((e) => e.id === endpointId);
      return endpoint ? endpoint.status === "ACTIVE" : null;
    },
    [endpoints, endpointsQuery.data],
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

  const deliveryTotal = deliveriesQuery.data?.total;
  const deliveryPagination = deliveriesQuery.data
    ? {
        page: deliveriesQuery.data.page,
        pageSize: deliveriesQuery.data.pageSize,
        total: deliveriesQuery.data.total,
        totalPages: deliveriesQuery.data.totalPages,
        onPageChange: setPage,
        busy: deliveriesQuery.isFetching,
      }
    : undefined;

  const activeState = tab === "endpoints" ? endpointsState : deliveriesState;

  return (
    <>
      <PageHeader
        title="Webhooks"
        description={
          tab === "endpoints"
            ? endpointsQuery.data === undefined
              ? undefined
              : `${fmtCount(endpoints.length)} ${endpoints.length === 1 ? "endpoint" : "endpoints"}`
            : deliveryTotal === undefined
              ? undefined
              : `${fmtCount(deliveryTotal)} ${deliveryTotal === 1 ? "delivery" : "deliveries"} in this view`
        }
        actions={
          <>
            <RefreshingDataBadge show={activeState.isRefreshing} />
            {tab === "endpoints" ? newButton : null}
          </>
        }
      />
      <PageToolbar
        leading={
          <PageTabs
            options={[
              {
                id: "endpoints",
                label: "Endpoints",
                icon: WebhooksLogoIcon,
                // The count is a badge that disappears at zero — never a
                // parenthesised "(0)" next to the destination noun.
                count: endpointsQuery.data ? endpoints.length : null,
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

      <PageBody padding="bare" className="overflow-y-auto">
        {tab === "endpoints" ? (
          <DataState
            state={endpointsState}
            resource="your webhook endpoints"
            skeleton={<ListSkeleton rows={3} leading="square" trailing />}
            empty={
              <EmptyState
                icon={WebhooksLogoIcon}
                title="No endpoints yet"
                description="An endpoint is a URL Semblia POSTs signed event payloads to as responses arrive, with automatic retries. Register one to drive your own workflows off Semblia events."
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
                  busy={endpointBusy}
                  onRotate={handleRotate}
                  onDisable={handleDisable}
                  onRevoke={handleRevoke}
                />
              ))}
            </DataList>
          </DataState>
        ) : (
          <DataState
            state={deliveriesState}
            resource="webhook deliveries"
            skeleton={
              <ListSkeleton
                rows={5}
                leading="none"
                trailing
                density="default"
              />
            }
            empty={
              // Nothing has fired yet. With no endpoints that is a setup gap;
              // with endpoints it is simply quiet, and gets no CTA.
              endpoints.length === 0 ? (
                <EmptyState
                  icon={ListBulletsIcon}
                  title="No deliveries yet"
                  description="Delivery attempts appear here once an endpoint exists and events start firing."
                  action={newButton}
                />
              ) : (
                <NoResults
                  title="No deliveries yet"
                  description="Nothing has fired to your endpoints so far. Attempts appear here as they happen, with their status and response."
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
                    onClick={() => setFilter("all")}
                  >
                    Show all deliveries
                  </Button>
                }
              />
            }
          >
            <DataList
              aria-label="Webhook deliveries"
              pagination={deliveryPagination}
            >
              {deliveries.map((delivery) => (
                <WebhookDeliveryRow
                  key={delivery.id}
                  delivery={delivery}
                  endpointActive={endpointActive(delivery.endpointId)}
                  onRetry={handleRetry}
                  isRetrying={
                    retry.isPending && retry.variables === delivery.id
                  }
                />
              ))}
            </DataList>
          </DataState>
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
    </>
  );
}
