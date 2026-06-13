"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ExportIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import type { V2DeliveryStatus } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
  FilterPills,
  type FilterPillOption,
} from "@/components/shared";
import {
  useExportDeliveries,
  useCreateCsvExport,
  useDownloadExport,
} from "@/hooks/api";
import { DeveloperShell } from "@/components/developers/developer-shell";
import {
  ExportDeliveryRow,
  ExportDeliveryRowSkeleton,
} from "./export-delivery-item";

const PAGE_SIZE = 20;

type StatusFilter = "all" | V2DeliveryStatus;

const FILTERS: FilterPillOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "SUCCEEDED", label: "Ready" },
  { id: "DELIVERING", label: "Running" },
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

  const deliveries = deliveriesQuery.data?.items ?? [];
  const totalPages = deliveriesQuery.data?.totalPages ?? 1;
  const total = deliveriesQuery.data?.total ?? 0;
  const isLoading = deliveriesQuery.isLoading;

  // Reset to page 1 whenever the active filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  function handleCreate() {
    createExport.mutate(undefined, {
      onSuccess: () => {
        toast.success("Export queued", {
          description: "Your CSV will appear below once it's ready.",
        });
        setFilter("all");
        setPage(1);
      },
      onError: () => {
        toast.error("Could not start export. Please try again.");
      },
    });
  }

  function handleDownload(deliveryId: string) {
    downloadExport.mutate(deliveryId, {
      onSuccess: ({ blob, filename }) => triggerBrowserDownload(blob, filename),
      onError: () => {
        toast.error("Download failed. The artifact may have expired.");
      },
    });
  }

  return (
    <DeveloperShell
      slug={slug}
      active="exports"
      actions={
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
      }
    >
      <PageToolbar
        contained
        leading={
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            size="sm"
            aria-label="Filter exports by status"
          />
        }
        trailing={
          total > 0 ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {total} {total === 1 ? "delivery" : "deliveries"}
            </span>
          ) : null
        }
      />

      <PageBody contained padding="bare" className="overflow-y-auto">
        {isLoading ? (
          <div className="divide-y divide-border">
            <ExportDeliveryRowSkeleton />
            <ExportDeliveryRowSkeleton />
            <ExportDeliveryRowSkeleton />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="px-4 py-10 sm:px-6">
            <Empty className="border border-dashed py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ExportIcon weight="bold" />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === "all"
                    ? "No exports yet"
                    : "No exports match this filter"}
                </EmptyTitle>
                <EmptyDescription>
                  {filter === "all"
                    ? "Generate a CSV of your responses to download or share. Deliveries appear here once processed."
                    : "Try a different status filter to see other deliveries."}
                </EmptyDescription>
              </EmptyHeader>
              {filter === "all" && (
                <EmptyContent>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleCreate}
                    disabled={createExport.isPending}
                  >
                    {createExport.isPending ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <ExportIcon
                        className="size-3.5"
                        weight="bold"
                        aria-hidden
                      />
                    )}
                    Export responses
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <>
            <div
              role="list"
              aria-label="Export deliveries"
              className="divide-y divide-border"
            >
              {deliveries.map((delivery) => (
                <div key={delivery.id} role="listitem">
                  <ExportDeliveryRow
                    delivery={delivery}
                    onDownload={handleDownload}
                    isDownloading={
                      downloadExport.isPending &&
                      downloadExport.variables === delivery.id
                    }
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!deliveriesQuery.data?.hasPrev}
                  >
                    <ArrowLeftIcon
                      className="size-3.5"
                      weight="bold"
                      aria-hidden
                    />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!deliveriesQuery.data?.hasNext}
                  >
                    Next
                    <ArrowRightIcon
                      className="size-3.5"
                      weight="bold"
                      aria-hidden
                    />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </DeveloperShell>
  );
}
