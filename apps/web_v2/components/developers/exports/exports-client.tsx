"use client";

/**
 * ExportsClient — the CSV export history.
 *
 * Rebuilt onto the shared data-surface system. What it was doing wrong:
 *   • a hand-written `isLoading ? … : deliveries.length === 0 ? … : rows`
 *     ladder, which meant a failed request rendered "No exports yet" — the
 *     surface told the user they had never exported anything after a 500
 *   • its own Previous/Next chrome reading "Page 1 of 4", which hides how many
 *     records exist and where in them you are
 *   • three per-row skeleton components instead of the shared `ListSkeleton`
 *
 * The one action here is destructive of nothing and cheap, so it is the page's
 * single primary CTA and appears in exactly two places: the header, and the
 * first-run empty state.
 */

import * as React from "react";
import { toast } from "sonner";
import { ExportIcon } from "@phosphor-icons/react";
import type { V2DeliveryStatus } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  PageHeader,
  PageBody,
  PageToolbar,
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
import {
  useExportDeliveries,
  useCreateCsvExport,
  useDownloadExport,
} from "@/hooks/api";
import { fmtCount } from "@/lib/format";
import { ExportDeliveryRow } from "./export-delivery-item";

const PAGE_SIZE = 20;

type StatusFilter = "all" | V2DeliveryStatus;

const FILTERS: FilterPillOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "SUCCEEDED", label: "Ready" },
  { id: "DELIVERING", label: "Generating" },
  { id: "PENDING", label: "Queued" },
  { id: "FAILED", label: "Failed" },
];

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportsClient({ slug }: { slug: string }) {
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);

  const deliveriesQuery = useExportDeliveries(slug, {
    page,
    pageSize: PAGE_SIZE,
    status: filter === "all" ? undefined : filter,
  });
  const createExport = useCreateCsvExport(slug);
  const downloadExport = useDownloadExport(slug);

  const deliveries = React.useMemo(
    () => deliveriesQuery.data?.items ?? [],
    [deliveriesQuery.data],
  );
  const state = useDataState(deliveriesQuery, {
    count: deliveries.length,
    filtered: filter !== "all",
  });

  // Reset to page 1 whenever the active filter changes — page 3 of "all" is
  // rarely page 3 of "failed".
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  function handleCreate() {
    createExport.mutate(undefined, {
      onSuccess: () => {
        toast.success("Export queued", {
          description: "The CSV appears below once it has been generated.",
        });
        setFilter("all");
        setPage(1);
      },
      onError: () => toast.error("Couldn't start the export. Try again."),
    });
  }

  function handleDownload(deliveryId: string) {
    downloadExport.mutate(deliveryId, {
      onSuccess: ({ blob, filename }) => triggerBrowserDownload(blob, filename),
      onError: () =>
        toast.error("Couldn't download the file.", {
          description: "The export may no longer be stored. Run a new one.",
        }),
    });
  }

  const exportButton = (
    <Button
      size="sm"
      className="gap-1.5 text-xs"
      onClick={handleCreate}
      disabled={createExport.isPending}
    >
      {createExport.isPending ? (
        <Spinner className="size-3.5" />
      ) : (
        <ExportIcon className="size-3.5" weight="bold" aria-hidden />
      )}
      Export responses
    </Button>
  );

  const total = deliveriesQuery.data?.total;
  const pagination = deliveriesQuery.data
    ? {
        page: deliveriesQuery.data.page,
        pageSize: deliveriesQuery.data.pageSize,
        total: deliveriesQuery.data.total,
        totalPages: deliveriesQuery.data.totalPages,
        onPageChange: setPage,
        busy: deliveriesQuery.isFetching,
      }
    : undefined;

  return (
    <>
      <PageHeader
        title="Exports"
        // Inline state, not prose: what this view currently holds.
        description={
          total === undefined
            ? undefined
            : `${fmtCount(total)} ${total === 1 ? "export" : "exports"} in this view`
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            {exportButton}
          </>
        }
      />
      <PageToolbar
        leading={
          // Stays mounted through every load — the control that scopes the
          // query must not vanish while the query runs.
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            size="sm"
            aria-label="Filter exports by status"
          />
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        <DataState
          state={state}
          resource="your exports"
          skeleton={<ListSkeleton rows={5} leading="square" trailing />}
          empty={
            <EmptyState
              icon={ExportIcon}
              title="No exports yet"
              description="An export packages every response in this project as a CSV you can download or hand to another tool. Exports are generated in the background and stay here afterwards."
              preview={<GhostList rows={3} leading="square" />}
              action={exportButton}
            />
          }
          filteredEmpty={
            <NoResults
              title={`No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? "matching"} exports`}
              description="Nothing in this project's export history has reached that state."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setFilter("all")}
                >
                  Show all exports
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Export deliveries" pagination={pagination}>
            {deliveries.map((delivery) => (
              <ExportDeliveryRow
                key={delivery.id}
                delivery={delivery}
                onDownload={handleDownload}
                isDownloading={
                  downloadExport.isPending &&
                  downloadExport.variables === delivery.id
                }
              />
            ))}
          </DataList>
        </DataState>
      </PageBody>
    </>
  );
}
