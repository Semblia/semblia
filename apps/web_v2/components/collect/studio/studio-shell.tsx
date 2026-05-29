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
  SlidersHorizontal as SlidersHorizontalIcon,
  Eye as EyeIcon,
} from "@phosphor-icons/react";
import {
  StudioDraftProvider,
  useStudioDraft,
} from "@/lib/collect/studio-draft-context";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { StudioControls } from "./studio-controls";
import { StudioPreview } from "./studio-preview";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import { StudioTopbar } from "./studio-topbar";

/* ─── Mobile tab type ─────────────────────────────────────────────────────── */

type MobileTab = "design" | "preview";

/* ─── Loading skeleton (shown while the draft resolves) ───────────────────── */

function StudioLoadingSkeleton({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div className="flex min-h-0 flex-1" aria-hidden="true">
      {isDesktop && (
        <aside className="w-[380px] shrink-0 space-y-3 border-r border-border/60 bg-sidebar p-5">
          <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </aside>
      )}
      <main className="flex min-h-0 flex-1 items-center justify-center bg-muted">
        <div className="h-[60%] w-[70%] max-w-2xl animate-pulse rounded-2xl bg-background/60" />
      </main>
    </div>
  );
}

export function StudioShell({
  slug,
  formId,
}: {
  slug: string;
  formId: string;
}) {
  return (
    <StudioDraftProvider slug={slug} formId={formId}>
      <StudioShellInner slug={slug} />
    </StudioDraftProvider>
  );
}

function StudioShellInner({ slug }: { slug: string }) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const { draft, dirty, save, reset, isSaving } = useStudioDraft();

  // Mobile: which tab is active
  const [mobileTab, setMobileTab] = React.useState<MobileTab>("preview");
  // Desktop: whether the sidebar is collapsed
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false);

  // Track dirty flag in a ref so window event handlers see the latest value
  // without needing to be re-bound on every change.
  const dirtyRef = React.useRef(dirty);
  React.useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // ─── Focus management ─────────────────────────────────────────────────
  React.useEffect(() => {
    const el = dialogRef.current;
    if (el) el.focus();
  }, []);

  // ─── Unsaved-changes guard (beforeunload) ─────────────────────────────
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ─── Save / Reset handlers ────────────────────────────────────────────

  const handleSave = React.useCallback(async () => {
    try {
      await save();
      toast.success("Studio changes saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save draft";
      toast.error(message);
    }
  }, [save]);

  const handleReset = React.useCallback(() => {
    reset();
    toast("Studio changes reset");
  }, [reset]);

  const handleClose = React.useCallback(() => {
    if (dirtyRef.current) {
      setLeaveConfirmOpen(true);
      return;
    }
    router.push(`/projects/${slug}/collect`);
  }, [router, slug]);

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
        if (dirtyRef.current) {
          void handleSave();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

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
      <StudioTopbar
        onClose={handleClose}
        isDesktop={isDesktop}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        dirty={dirty}
        isSaving={isSaving}
        onReset={handleReset}
        onSave={handleSave}
      />

      {/* ─── Body ───────────────────────────────────────────────────────────── */}
      {!draft ? (
        <StudioLoadingSkeleton isDesktop={isDesktop} />
      ) : isDesktop ? (
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
              <StudioControls />
            </div>
          </aside>

          <main
            className="flex min-h-0 h-full flex-1 flex-col min-w-0"
            aria-label="Form preview"
          >
            <StudioPreview />
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
              <StudioControls />
            </div>
            <div
              className={cn(
                "absolute inset-0 overflow-hidden",
                mobileTab === "preview" ? "visible" : "invisible",
              )}
              aria-hidden={mobileTab !== "preview"}
            >
              <StudioPreview />
            </div>
          </div>

          {/* Bottom tab bar */}
          <div
            className="flex h-12 shrink-0 border-t border-border/60 bg-background"
            role="tablist"
            aria-label="Studio panels"
          >
            <Button
              variant="ghost"
              role="tab"
              aria-selected={mobileTab === "design"}
              onClick={() => setMobileTab("design")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 text-xs font-medium transition-colors h-full rounded-none",
                mobileTab === "design"
                  ? "text-foreground bg-muted/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
              Design
            </Button>
            <span
              className="w-px self-stretch bg-border/60"
              aria-hidden="true"
            />
            <Button
              variant="ghost"
              role="tab"
              aria-selected={mobileTab === "preview"}
              onClick={() => setMobileTab("preview")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 text-xs font-medium transition-colors h-full rounded-none",
                mobileTab === "preview"
                  ? "text-foreground bg-muted/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <EyeIcon className="size-4" aria-hidden="true" />
              Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
