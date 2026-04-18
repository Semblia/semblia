"use client";

/**
 * StudioShell — full-screen testimonial form builder.
 * Uses dialog semantics with focus management for accessibility.
 * Left: controls panel (380px, Sheet on mobile). Right: preview stage.
 * Top: topbar with save/reset/close.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  SaveIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { useStudioStore, isStudioDirty } from "@/lib/collect/studio-store";
import { StudioControls } from "./studio-controls";
import { StudioPreview } from "./studio-preview";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function StudioShell({ slug, formId }: { slug: string; formId: string }) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [mobileControlsOpen, setMobileControlsOpen] = React.useState(false);

  // ─── Granular selectors — avoid full-store subscription ────────────────
  const dirty = useStudioStore((s) => {
    const snap = s.snapshots[formId];
    return snap ? isStudioDirty(snap) : false;
  });
  const hasSnapshot = useStudioStore((s) => !!s.snapshots[formId]);
  const ensureProject = useStudioStore((s) => s.ensureProject);
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
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.push(`/projects/${slug}/collect`);
  }, [router, slug, formId]);

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
      {/* ─── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4">
        {/* Left: back button */}
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to form list"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back to forms</span>
        </button>

        {/* Center: title + dirty dot */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Testimonial Studio</span>
          {dirty && (
            <span
              className="size-1.5 rounded-full bg-amber-500"
              title="Unsaved changes"
              aria-label="Unsaved changes"
              role="status"
            />
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Mobile controls toggle */}
          <Sheet open={mobileControlsOpen} onOpenChange={setMobileControlsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs lg:hidden"
                aria-label="Open design controls"
              >
                <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
                Controls
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[360px] p-0 sm:w-[380px]">
              <SheetTitle className="sr-only">Design Controls</SheetTitle>
              <StudioControls formId={formId} />
            </SheetContent>
          </Sheet>

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

      {/* ─── Body: controls + preview ───────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Controls panel — scrollable (desktop only; mobile uses Sheet) */}
        <aside
          className="hidden w-[380px] shrink-0 border-r border-border/60 lg:block"
          aria-label="Design controls"
        >
          <StudioControls formId={formId} />
        </aside>

        {/* Preview stage */}
        <main className="flex-1" aria-label="Form preview">
          <StudioPreview formId={formId} />
        </main>
      </div>
    </div>
  );
}
