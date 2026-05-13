"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { TestimonialsClient } from "@/components/testimonials/testimonials-client";
import { TestimonialDetail } from "@/components/testimonials/testimonial-detail";
import { KbdShortcutsDialog } from "@/components/kbd-shortcuts-dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { apiGetTestimonial } from "@/lib/api";
import type { MockTestimonial } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useTestimonialModeration } from "@/hooks/use-testimonial-moderation";
import { PageHeader, HeaderSep, PageTabs } from "@/components/shared";
import {
  STATUS_TABS,
  type StatusFilter,
} from "@/components/testimonials/testimonials-filter-bar";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TestimonialsInboxProps {
  projectId: string;
  projectSlug: string;
  totalCount: number;
  pendingCount: number;
  /** Public hosted collection URL — used by the empty-state hero. */
  collectionUrl: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TestimonialsInbox({
  projectId,
  projectSlug,
  totalCount,
  pendingCount,
  collectionUrl,
}: TestimonialsInboxProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Status filter — lifted here so tabs render in PageHeader toolbar
  const [status, setStatus] = React.useState<StatusFilter>("ALL");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<MockTestimonial | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Track closing state for exit animation
  const [panelClosing, setPanelClosing] = React.useState(false);
  // Track whether panel should render (stays true during exit animation)
  const [panelVisible, setPanelVisible] = React.useState(false);

  // Moderation actions (optimistic)
  const {
    handleApprove,
    handleReject,
    handleTogglePublish,
    handleInlineApprove,
    handleInlineReject,
  } = useTestimonialModeration(detail, setDetail);

  // Keyboard shortcut dialog
  const [kbdOpen, setKbdOpen] = React.useState(false);

  // Visible item IDs for j/k navigation
  const [visibleIds, setVisibleIds] = React.useState<string[]>([]);
  const handleItemsChange = React.useCallback((ids: string[]) => {
    setVisibleIds(ids);
  }, []);

  // ── Fetch detail when selection changes ──
  React.useEffect(() => {
    if (!selectedId) {
      return;
    }

    let cancelled = false;
    // Clear stale detail immediately so user sees loading skeleton
    setDetail(null);
    setDetailLoading(true);

    apiGetTestimonial(projectId, selectedId).then((data) => {
      if (!cancelled) {
        setDetail(data);
        setDetailLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, selectedId]);

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
        router.push(`/projects/${projectSlug}/testimonials/${id}`);
      }
    },
    [isDesktop, projectSlug, router],
  );

  const handleCloseDetail = React.useCallback(() => {
    setPanelClosing(true);
    // Wait for exit animation to complete before unmounting
    setTimeout(() => {
      setSelectedId(null);
      setDetail(null);
      setPanelClosing(false);
      setPanelVisible(false);
    }, 200);
  }, []);

  // ── Clear selection when switching to mobile ──
  React.useEffect(() => {
    if (!isDesktop) {
      setSelectedId(null);
      setDetail(null);
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
    {
      key: "p",
      label: "Toggle publish",
      group: "Actions",
      action: () => {
        if (detail) {
          handleTogglePublish(detail.id, !detail.isPublished);
        }
      },
      enabled: () => !!detail,
    },
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <KbdShortcutsDialog open={kbdOpen} onOpenChange={setKbdOpen} />

      {/* ── Page header ── */}
      <PageHeader
        density="compact"
        title="Testimonials"
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
        toolbar={
          <PageTabs<StatusFilter>
            aria-label="Filter testimonials by status"
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
          <TestimonialsClient
            projectId={projectId}
            projectSlug={projectSlug}
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
            <TestimonialDetail
              testimonial={detail}
              loading={detailLoading}
              onClose={handleCloseDetail}
              onApprove={handleApprove}
              onReject={handleReject}
              onTogglePublish={handleTogglePublish}
            />
          </div>
        )}
      </div>
    </div>
  );
}
