"use client";

/**
 * StudioShell — full-screen testimonial form builder.
 *
 * Layout strategy:
 * ≥ lg (1024px) — Side-by-side: collapsible controls sidebar + preview stage.
 * < lg           — Tab layout: "Design" and "Preview" are equal full-width peers.
 *                  Each tab gets the entire viewport width. No Sheet overlay.
 *
 * This avoids the fundamental problem of trying to fit two panels in
 * insufficient space or using an overlay that hides one panel entirely.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft as ArrowLeftIcon,
  FloppyDisk as SaveIcon,
  ArrowCounterClockwise as RotateCcwIcon,
  SidebarSimple as PanelLeftCloseIcon,
  SidebarSimple as PanelLeftOpenIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  Eye as EyeIcon,
} from "@phosphor-icons/react";
import { useStudioStore, isStudioDirty } from "@/lib/collect/studio-store";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { StudioControls } from "./studio-controls";
import { StudioPreview } from "./studio-preview";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";

/* ─── Mobile tab type ─────────────────────────────────────────────────────── */

type MobileTab = "design" | "preview";

export function StudioShell({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  // Mobile: which tab is active
  const [mobileTab, setMobileTab] = React.useState<MobileTab>("preview");
  // Desktop: whether the sidebar is collapsed
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false);

  // ─── Granular selectors — avoid full-store subscription ────────────────
  const dirty = useStudioStore((s) => {
    const snap = s.snapshots[formId];
    return snap ? isStudioDirty(snap) : false;
  });
  const hasSnapshot = useStudioStore((s) => !!s.snapshots[formId]);
  const save = useStudioStore((s) => s.save);
  const reset = useStudioStore((s) => s.reset);

  // Ensure the project has snapshots on mount
  React.useEffect(() => {
    useStudioStore.getState().ensureProject(slug);
  }, [slug]);

  // ─── Focus management ─────────────────────────────────────────────────
  React.useEffect(() => {
    const el = dialogRef.current;
    if (el) el.focus();
  }, []);

  // ─── Unsaved-changes guard (beforeunload) ─────────────────────────────
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const snap = useStudioStore.getState().snapshots[formId];
      if (snap && isStudioDirty(snap)) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [formId]);

  // ─── Save / Reset handlers ────────────────────────────────────────────

  const handleSave = React.useCallback(() => {
    save(formId);
    toast.success("Studio changes saved");
  }, [save, formId]);

  const handleReset = React.useCallback(() => {
    reset(formId);
    toast("Studio changes reset");
  }, [reset, formId]);

  const handleClose = React.useCallback(() => {
    const snap = useStudioStore.getState().snapshots[formId];
    if (snap && isStudioDirty(snap)) {
      setLeaveConfirmOpen(true);
      return;
    }
    router.push(`/projects/${slug}/collect`);
  }, [router, slug, formId]);

  const handleConfirmLeave = React.useCallback(() => {
    setLeaveConfirmOpen(false);
    router.push(`/projects/${slug}/collect`);
  }, [router, slug]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        const snap = useStudioStore.getState().snapshots[formId];
        if (snap && isStudioDirty(snap)) {
          useStudioStore.getState().save(formId);
          toast.success("Saved");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [formId]);

  if (!hasSnapshot) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Testimonial Studio Editor"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      <ConfirmationDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        intent="warning"
        size="sm"
        title="Leave studio without saving?"
        description="You have unsaved changes in this form. Leaving now will discard them."
        cancelLabel="Keep editing"
        confirmLabel="Leave anyway"
        onConfirm={handleConfirmLeave}
      />
      {/* Google Fonts for studio preview — React 19 hoists to <head> */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Caveat:wght@400..700&display=swap"
      />
      {/* ─── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-2 sm:px-4">
        {/* Left: back + sidebar toggle (desktop) */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to form list"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to forms</span>
          </button>

          {/* Desktop sidebar toggle */}
          {isDesktop && (
            <>
              <span
                className="mx-1.5 hidden h-4 w-px bg-border/60 lg:block"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSidebarOpen((o) => !o)}
                aria-label={
                  sidebarOpen
                    ? "Collapse controls panel"
                    : "Expand controls panel"
                }
                className="hidden lg:flex"
              >
                {sidebarOpen ? (
                  <PanelLeftCloseIcon className="size-4" aria-hidden="true" />
                ) : (
                  <PanelLeftOpenIcon className="size-4" aria-hidden="true" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Center: title + dirty dot */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-medium sm:text-sm">
            Testimonial Studio
          </span>
          {dirty && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-amber-500"
              title="Unsaved changes"
              aria-label="Unsaved changes"
              role="status"
            />
          )}
        </div>

        {/* Right: save/reset */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!dirty}
            className="gap-1.5 text-xs"
          >
            <RotateCcwIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty}
            className="gap-1.5 text-xs"
          >
            <SaveIcon className="size-3.5" aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────────────────────── */}
      {isDesktop ? (
        /* ── Desktop: side-by-side with collapsible sidebar ─────────────── */
        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "shrink-0 border-r border-border/60 transition-[width] duration-200 ease-in-out overflow-hidden",
              sidebarOpen ? "w-[380px]" : "w-0",
            )}
            aria-label="Design controls"
            aria-hidden={!sidebarOpen}
          >
            <div className="w-[380px] h-full">
              <StudioControls formId={formId} />
            </div>
          </aside>

          <main className="flex min-h-0 h-full flex-1 flex-col min-w-0" aria-label="Form preview">
            <StudioPreview formId={formId} />
          </main>
        </div>
      ) : (
        /* ── Mobile/Tablet: tab layout — each tab gets full width ────── */
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Tab content */}
          <div className="relative min-h-0 flex-1">
            <div
              className={cn(
                "absolute inset-0 overflow-hidden",
                mobileTab === "design" ? "visible" : "invisible",
              )}
              aria-hidden={mobileTab !== "design"}
            >
              <StudioControls formId={formId} />
            </div>
            <div
              className={cn(
                "absolute inset-0 overflow-hidden",
                mobileTab === "preview" ? "visible" : "invisible",
              )}
              aria-hidden={mobileTab !== "preview"}
            >
              <StudioPreview formId={formId} />
            </div>
          </div>

          {/* Bottom tab bar */}
          <div
            className="flex h-12 shrink-0 border-t border-border/60 bg-background"
            role="tablist"
            aria-label="Studio panels"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "design"}
              onClick={() => setMobileTab("design")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 text-xs font-medium transition-colors",
                mobileTab === "design"
                  ? "text-foreground bg-muted/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
              Design
            </button>
            <span
              className="w-px self-stretch bg-border/60"
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "preview"}
              onClick={() => setMobileTab("preview")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 text-xs font-medium transition-colors",
                mobileTab === "preview"
                  ? "text-foreground bg-muted/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <EyeIcon className="size-4" aria-hidden="true" />
              Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
