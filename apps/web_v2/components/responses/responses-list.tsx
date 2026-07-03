"use client";

/**
 * ResponsesList — the moderation inbox (the "Manage" step of the Collect →
 * Manage → Display pipeline). Review incoming testimonials, approve the good
 * ones, and feature them so they flow into widgets. Composed from the shared
 * list primitives (PageHeader / PageBody / ItemRow) so it reads as native.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ChatCircleText } from "@phosphor-icons/react";
import {
  PageHeader,
  PageBody,
  RefreshingDataBadge,
  FilterPills,
  EmptyState,
  NoResults,
  GhostList,
} from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import type {
  V2ProjectDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import {
  useResponses,
  useUpdateResponseStatus,
  useUpdateResponsePublish,
  useDeleteResponse,
} from "@/hooks/api";
import { ResponseRow } from "./response-row";

type Filter = "all" | "pending" | "approved" | "featured";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "featured", label: "Featured" },
];

function paramsFor(filter: Filter) {
  switch (filter) {
    case "pending":
      return { reviewStatus: "PENDING" };
    case "approved":
      return { reviewStatus: "APPROVED" };
    case "featured":
      return { publishStatus: "PUBLISHED" };
    default:
      return {};
  }
}

export function ResponsesList({ project }: { project: V2ProjectDTO }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = (searchParams.get("status") ?? "all") as Filter;
  const filter: Filter = FILTERS.some((f) => f.id === raw) ? raw : "all";

  const setFilter = (next: Filter) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "all") sp.delete("status");
    else sp.set("status", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const listQuery = useResponses(project.slug, {
    ...paramsFor(filter),
    sort: "newest",
    pageSize: 30,
  });
  const { isWaitingForLiveData, isBackgroundRefreshing } =
    useLiveQueryState(listQuery);

  const statusMutation = useUpdateResponseStatus(project.slug);
  const publishMutation = useUpdateResponsePublish(project.slug);
  const deleteMutation = useDeleteResponse(project.slug);
  const busy =
    statusMutation.isPending ||
    publishMutation.isPending ||
    deleteMutation.isPending;

  const items = listQuery.data?.items ?? [];
  const loading = isWaitingForLiveData;

  const handleStatus = (responseId: string, status: string, label: string) => {
    statusMutation.mutate(
      { responseId, status },
      {
        onSuccess: () => toast.success(label),
        onError: () => toast.error("Couldn't update. Try again."),
      },
    );
  };
  const handlePublish = (
    responseId: string,
    status: V2FormResponsePublishStatus,
  ) => {
    publishMutation.mutate(
      { responseId, status },
      {
        onSuccess: () =>
          toast.success(status === "PUBLISHED" ? "Featured" : "Unpublished"),
        onError: () => toast.error("Couldn't update. Try again."),
      },
    );
  };
  const handleDelete = (responseId: string) => {
    deleteMutation.mutate(responseId, {
      onSuccess: () => toast.success("Response deleted"),
      onError: () => toast.error("Couldn't delete. Try again."),
    });
  };

  const showToolbar = !loading;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Responses"
        actions={
          showToolbar ? (
            <RefreshingDataBadge show={isBackgroundRefreshing} />
          ) : undefined
        }
        toolbar={
          showToolbar ? (
            <FilterPills
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              size="sm"
              aria-label="Filter responses"
            />
          ) : undefined
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        {loading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <ResponsesEmpty filter={filter} slug={project.slug} />
        ) : (
          <div
            className="divide-y divide-border"
            role="list"
            aria-label="Responses"
          >
            {items.map((r) => (
              <ResponseRow
                key={r.id}
                response={r}
                busy={busy}
                onApprove={() => handleStatus(r.id, "APPROVED", "Approved")}
                onReject={() => handleStatus(r.id, "REJECTED", "Rejected")}
                onTogglePublish={(next) => handlePublish(r.id, next)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-6">
          <Skeleton className="size-9 shrink-0 rounded-full animate-shimmer" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32 animate-shimmer" />
            <Skeleton className="h-2.5 w-3/4 animate-shimmer" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

function ResponsesEmpty({ filter, slug }: { filter: Filter; slug: string }) {
  if (filter !== "all") {
    return (
      <NoResults
        title={`No ${filter} responses`}
        description="Nothing matches this filter yet — try another tab above."
      />
    );
  }
  return (
    <EmptyState
      icon={ChatCircleText}
      title="No responses yet"
      description="Responses are the testimonials people submit through your Forms. Review them here, approve the good ones, and feature them to show up in your Widgets."
      preview={<GhostList rows={3} leading="circle" trailingPill />}
      action={
        <Button asChild size="sm" className="text-xs">
          <Link href={`/projects/${slug}/forms`}>Share a form to collect</Link>
        </Button>
      }
    />
  );
}
