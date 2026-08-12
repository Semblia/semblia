"use client";

/**
 * RequestList — the Requests surface: testimonial asks the project has sent,
 * newest first, with a per-recipient breakdown on each one (`RequestRow`).
 *
 * Built on the same data-surface system as `FormList` — `useDataState` +
 * `DataState` derive the state error-first, so an empty inbox and a failed
 * fetch can't be confused for each other. There is no filter toolbar: a
 * project sends few enough requests that scanning the full list beats
 * building filter machinery this surface doesn't need yet.
 */

import * as React from "react";
import { PaperPlaneTiltIcon, PlusIcon } from "@phosphor-icons/react";
import type { V2ProjectDTO } from "@workspace/types";
import {
  PageHeader,
  PageBody,
  RefreshingDataBadge,
  DataState,
  DataList,
  ListSkeleton,
  EmptyState,
  useDataState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useFormRequestsList } from "@/hooks/api";
import { fmtCount } from "@/lib/format";
import { RequestRow } from "./request-row";
import { RequestComposerDialog } from "./request-composer-dialog";

/** "N requests sent" — absent until there is a real number to show. */
function requestsDescription(count: number | null): string | undefined {
  if (count === null) return undefined;
  return `${fmtCount(count)} ${count === 1 ? "request" : "requests"} sent`;
}

export function RequestList({ project }: { project: V2ProjectDTO }) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const listQuery = useFormRequestsList(project.slug);

  const requests = React.useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const state = useDataState(listQuery, { count: requests.length });

  const openComposer = React.useCallback(() => setComposerOpen(true), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Requests"
        description={requestsDescription(
          listQuery.data ? requests.length : null,
        )}
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={openComposer}
            >
              <PlusIcon className="size-3.5" weight="bold" aria-hidden />
              New request
            </Button>
          </>
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <DataState
          state={state}
          resource="requests"
          skeleton={
            <ListSkeleton
              rows={4}
              leading="none"
              trailing={false}
              density="comfortable"
            />
          }
          empty={
            <EmptyState
              icon={PaperPlaneTiltIcon}
              title="No requests sent yet"
              description="Ask a customer directly instead of waiting for them to find your form — Semblia emails them a link and tracks who answers."
              action={
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={openComposer}
                >
                  <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                  New request
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Testimonial requests">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                slug={project.slug}
                request={request}
              />
            ))}
          </DataList>
        </DataState>
      </PageBody>

      <RequestComposerDialog
        slug={project.slug}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        presetForm={null}
      />
    </div>
  );
}
