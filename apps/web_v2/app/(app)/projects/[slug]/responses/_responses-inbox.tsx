"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { ResponsesClient } from "@/components/responses/responses-client";
import { ResponseDetail } from "@/components/responses/response-detail";
import { KbdShortcutsDialog } from "@/components/kbd-shortcuts-dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { useResponseModeration } from "@/hooks/use-response-moderation";
import {
  useCreateResponseAnnotation,
  useProject,
  useResponse,
} from "@/hooks/api";
import { getProjectCollectionUrl } from "@/lib/project-utils";
import { PageHeader, HeaderSep, PageTabs } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  STATUS_TABS,
  type StatusFilter,
} from "@/components/responses/responses-filter-bar";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResponsesInboxProps {
  slug: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResponsesInbox({ slug }: ResponsesInboxProps) {
  const { data: project } = useProject(slug);
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Derive project data — guard rendering until project is available
  const projectId = project?.id ?? null;
  const totalCount = project?._count.responses ?? 0;
  const pendingCount = project?._count.pendingModeration ?? 0;
  const collectionUrl = project ? getProjectCollectionUrl(project) : undefined;

  // Status filter — lifted here so tabs render in PageHeader toolbar
  const [status, setStatus] = React.useState<StatusFilter>("ALL");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Track closing state for exit animation
  const [panelClosing, setPanelClosing] = React.useState(false);
  // Track whether panel should render (stays true during exit animation)
  const [panelVisible, setPanelVisible] = React.useState(false);

  // Detail query — only fetches when a row is selected
  const detailQuery = useResponse(slug, selectedId ?? "");
  const detail = React.useMemo(
    () => detailQuery.data ?? null,
    [detailQuery.data],
  );
  const detailLoading = !!selectedId && detailQuery.isPending;

  // Moderation actions — invalidate cache on success
  const {
    handleApprove,
    handleReject,
    handleInlineApprove,
    handleInlineReject,
    isApproving,
    isRejecting,
  } = useResponseModeration(slug);
  const createAnnotation = useCreateResponseAnnotation(slug);

  // Keyboard shortcut dialog
  const [kbdOpen, setKbdOpen] = React.useState(false);

  // Visible item IDs for j/k navigation
  const [visibleIds, setVisibleIds] = React.useState<string[]>([]);
  const handleItemsChange = React.useCallback((ids: string[]) => {
    setVisibleIds(ids);
  }, []);

  // Sync panel visibility with selectedId
  React.useEffect(() => {
    if (selectedId) {
      setPanelClosing(false);
      setPanelVisible(true);
    }
  }, [selectedId]);

  // ── Selection handler — desktop inline, mobile navigate ──
  const handleSelect = React.useCallback(
    (id: string) => {
      if (isDesktop) {
        setSelectedId((prev) => (prev === id ? prev : id));
      } else {
        router.push(`/projects/${slug}/responses/${id}`);
      }
    },
    [isDesktop, slug, router],
  );

  const handleCloseDetail = React.useCallback(() => {
    setPanelClosing(true);
    // Wait for exit animation to complete before unmounting
    setTimeout(() => {
      setSelectedId(null);
      setPanelClosing(false);
      setPanelVisible(false);
    }, 200);
  }, []);

  // ── Clear selection when switching to mobile ──
  React.useEffect(() => {
    if (!isDesktop) {
      setSelectedId(null);
      setPanelVisible(false);
    }
  }, [isDesktop]);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts([
    {
      key: "?",
      label: "Show keyboard shortcuts",
      group: "General",
      action: () => setKbdOpen(true),
    },
    {
      key: "j",
      label: "Next item",
      group: "Navigation",
      action: () => {
        if (visibleIds.length === 0) return;
        const idx = selectedId ? visibleIds.indexOf(selectedId) : -1;
        const next = visibleIds[Math.min(idx + 1, visibleIds.length - 1)];
        if (next) handleSelect(next);
      },
    },
    {
      key: "k",
      label: "Previous item",
      group: "Navigation",
      action: () => {
        if (visibleIds.length === 0) return;
        const idx = selectedId
          ? visibleIds.indexOf(selectedId)
          : visibleIds.length;
        const prev = visibleIds[Math.max(idx - 1, 0)];
        if (prev) handleSelect(prev);
      },
    },
    {
      key: "Escape",
      label: "Close panel",
      group: "Navigation",
      action: () => {
        if (selectedId) handleCloseDetail();
      },
      enabled: () => !!selectedId,
    },
    {
      key: "a",
      label: "Approve",
      group: "Actions",
      action: () => {
        if (
          detail &&
          (detail.moderationStatus === "PENDING" ||
            detail.moderationStatus === "FLAGGED")
        ) {
          handleApprove(detail.id);
        }
      },
      enabled: () => !!detail,
    },
    {
      key: "r",
      label: "Reject",
      group: "Actions",
      action: () => {
        if (
          detail &&
          (detail.moderationStatus === "PENDING" ||
            detail.moderationStatus === "FLAGGED")
        ) {
          handleReject(detail.id);
        }
      },
      enabled: () => !!detail,
    },
  ]);

  // Guard: wait until project is loaded before rendering list/detail
  if (!projectId) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader
          density="compact"
          title="Responses"
          description={<Skeleton className="h-3 w-32 animate-shimmer" />}
        />
        <div className="flex-1 divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-5 py-3.5">
              <Skeleton className="size-7 shrink-0 rounded-full animate-shimmer" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32 animate-shimmer" />
                <Skeleton className="h-3 w-full animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <KbdShortcutsDialog open={kbdOpen} onOpenChange={setKbdOpen} />

      {/* ── Page header ── */}
      <PageHeader
        density="compact"
        title="Responses"
        description={
          <>
            <span>{totalCount} total</span>
            {pendingCount > 0 && (
              <>
                <HeaderSep />
                <span className="font-medium text-warning">
                  {pendingCount} pending
                </span>
              </>
            )}
          </>
        }
        actions={
          pendingCount > 0 && status !== "PENDING" ? (
            <Button
              size="xs"
              variant="outline"
              className="gap-1.5 border-warning/30 bg-warning/[0.06] text-warning hover:bg-warning/10 hover:text-warning"
              onClick={() => setStatus("PENDING")}
            >
              Review {pendingCount} pending
            </Button>
          ) : undefined
        }
        toolbar={
          <PageTabs<StatusFilter>
            aria-label="Filter responses by status"
            options={STATUS_TABS.map((t) => ({ id: t.key, label: t.label }))}
            value={status}
            onChange={setStatus}
          />
        }
      />

      {/* ── Master-detail split ── */}
      <div className="flex flex-1 min-h-0">
        {/* List column — independently scrollable */}
        <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          <ResponsesClient
            slug={slug}
            collectionUrl={collectionUrl}
            status={status}
            selectedId={selectedId}
            onSelect={handleSelect}
            onInlineApprove={handleInlineApprove}
            onInlineReject={handleInlineReject}
            onItemsChange={handleItemsChange}
          />
        </div>

        {/* Detail column — desktop only, animated slide in/out */}
        {panelVisible && (
          <div
            className={cn(
              "hidden lg:flex lg:w-[420px] lg:shrink-0 flex-col border-l border-border bg-background overflow-hidden",
              panelClosing
                ? "detail-panel-slide-exit"
                : "detail-panel-slide-enter",
            )}
          >
            <ResponseDetail
              response={detail}
              loading={detailLoading}
              onClose={handleCloseDetail}
              onApprove={handleApprove}
              onReject={handleReject}
              onCreateAnnotation={(responseId, body) =>
                createAnnotation.mutateAsync({ responseId, ...body })
              }
              isCreatingAnnotation={createAnnotation.isPending}
              isApproving={isApproving}
              isRejecting={isRejecting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
