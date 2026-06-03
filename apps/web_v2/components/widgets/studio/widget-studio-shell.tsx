"use client";

/**
 * WidgetStudioShell — full-screen overlay editor.
 *
 * Layout (≥ 1024px): Topbar + (Rail | Controls | Preview)
 * Layout (< 1024px):  Topbar + four-tab body (Layout | Style | Content | Preview)
 *
 * Hard constraints:
 *   - URL params drive panel & share & device & firstRun.
 *   - Unsaved-changes guard intercepts close + rail navigation.
 *   - Cmd/Ctrl+S = save when dirty.
 */

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Eye as EyeIcon,
  PaintBrushBroad as PaintIcon,
  ListBullets as ListIcon,
  Rows as RowsIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useProject, useResponsesList } from "@/hooks/api";
import { selectPreviewTestimonials } from "@/lib/widgets/widget-fallback-testimonials";
import { toWidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import {
  useWidgetStudioStore,
  isWidgetDirty,
} from "@/lib/widgets/widget-studio-store";

import { WidgetStudioTopbar } from "./widget-studio-topbar";
import { WidgetStudioRail } from "./widget-studio-rail";
import { WidgetStudioControls } from "./widget-studio-controls";
import { WidgetStudioPreview } from "./widget-studio-preview";
import { WidgetShareDrawer } from "./widget-share-drawer";

type MobileTab = "layout" | "style" | "content" | "preview";

interface WidgetStudioShellProps {
  slug: string;
  widgetId: string;
}

export function WidgetStudioShell({ slug, widgetId }: WidgetStudioShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // ── Granular store selectors ────────────────────────────────
  const snapshot = useWidgetStudioStore((s) => s.snapshots[widgetId]);
  const draft = snapshot?.draft;
  const dirty = useWidgetStudioStore((s) =>
    s.snapshots[widgetId] ? isWidgetDirty(s.snapshots[widgetId]) : false,
  );
  const isFirstRun = snapshot?.isFirstRun ?? false;

  const widgetsByProject = useWidgetStudioStore(
    (s) => s.widgetsByProject[slug],
  );
  const allSnapshots = useWidgetStudioStore((s) => s.snapshots);

  const ensureProject = useWidgetStudioStore((s) => s.ensureProject);
  const save = useWidgetStudioStore((s) => s.save);
  const reset = useWidgetStudioStore((s) => s.reset);
  const setName = useWidgetStudioStore((s) => s.setName);
  const clearFirstRun = useWidgetStudioStore((s) => s.clearFirstRun);

  // ── URL search params ───────────────────────────────────────
  const shareOpen = searchParams.get("share") === "1";
  const firstRunFlag = searchParams.get("firstRun") === "1";

  const setQuery = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ── Mobile tab state ────────────────────────────────────────
  const [mobileTab, setMobileTab] = React.useState<MobileTab>("preview");

  // ── Confirm-leave dialog ────────────────────────────────────
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const pendingNavRef = React.useRef<string | null>(null);

  // ── Project hydration / preview testimonials ────────────────
  const projectQuery = useProject(slug);
  const project = projectQuery.data ?? null;
  const approvedQuery = useResponsesList(slug, {
    moderationStatus: "APPROVED",
    pageSize: 200,
  });

  // Gate render until persist has had a chance to rehydrate. zustand persist
  // does not block first render, so a direct deep link can race the store
  // and falsely conclude the widget is missing.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    ensureProject(slug, { brandColor: project?.brandColorPrimary ?? null });
    setHydrated(true);
  }, [slug, project?.brandColorPrimary, ensureProject]);

  const previewItems = React.useMemo(() => {
    const real = (approvedQuery.data?.items ?? []).map(toWidgetTestimonial);
    const { items } = selectPreviewTestimonials(real, 12);
    return items;
  }, [approvedQuery.data]);

  // ── Initial focus ───────────────────────────────────────────
  React.useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // ── Unsaved changes / beforeunload ──────────────────────────
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const snap = useWidgetStudioStore.getState().snapshots[widgetId];
      if (snap && isWidgetDirty(snap)) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [widgetId]);

  // ── Cmd+S to save ───────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const snap = useWidgetStudioStore.getState().snapshots[widgetId];
        if (snap && isWidgetDirty(snap)) {
          save(widgetId);
          toast.success("Saved");
          // First save → open share drawer (celebrate moment).
          if (snap.isFirstRun) {
            setQuery({ share: "1" });
            clearFirstRun(widgetId);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [widgetId, save, clearFirstRun, setQuery]);

  // ── Navigation handlers (with unsaved guard) ────────────────
  const navigateGuarded = React.useCallback(
    (href: string) => {
      const snap = useWidgetStudioStore.getState().snapshots[widgetId];
      if (snap && isWidgetDirty(snap)) {
        pendingNavRef.current = href;
        setLeaveOpen(true);
        return;
      }
      router.push(href);
    },
    [widgetId, router],
  );

  const handleClose = React.useCallback(() => {
    navigateGuarded(`/projects/${slug}/widgets`);
  }, [slug, navigateGuarded]);

  const handleConfirmLeave = React.useCallback(() => {
    setLeaveOpen(false);
    if (pendingNavRef.current) {
      router.push(pendingNavRef.current);
      pendingNavRef.current = null;
    }
  }, [router]);

  const handleSave = React.useCallback(() => {
    save(widgetId);
    toast.success("Saved");
    if (isFirstRun) {
      setQuery({ share: "1" });
      clearFirstRun(widgetId);
    }
  }, [save, widgetId, isFirstRun, setQuery, clearFirstRun]);

  const handleReset = React.useCallback(() => {
    reset(widgetId);
    toast("Changes reset");
  }, [reset, widgetId]);

  const handleToggleShare = React.useCallback(() => {
    setQuery({ share: shareOpen ? null : "1" });
  }, [shareOpen, setQuery]);

  // Drop the firstRun param from the URL once consumed (purely cosmetic).
  React.useEffect(() => {
    if (firstRunFlag) {
      const t = window.setTimeout(() => setQuery({ firstRun: null }), 600);
      return () => window.clearTimeout(t);
    }
  }, [firstRunFlag, setQuery]);

  // ── Loading state during hydration ──────────────────────────
  if (!hydrated) {
    return (
      <div
        ref={dialogRef}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        aria-busy
      >
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  // ── Bail out when widget doesn't exist (post-delete or stale link) ─
  if (!draft || !project) {
    return (
      <div
        ref={dialogRef}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      >
        <p className="text-sm text-muted-foreground">
          This widget no longer exists.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/projects/${slug}/widgets`)}
          className="mt-3 text-xs text-foreground underline-offset-2 hover:underline"
        >
          Back to widgets
        </button>
      </div>
    );
  }

  const entries = widgetsByProject ?? [];
  const siblingConfigs: Record<string, typeof draft> = {};
  for (const e of entries) {
    const s = allSnapshots[e.id];
    if (s) siblingConfigs[e.id] = s.draft;
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Widget Studio Editor"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      <ConfirmationDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        intent="warning"
        size="sm"
        title="Leave studio without saving?"
        description="You have unsaved changes in this widget. Leaving now will discard them."
        cancelLabel="Keep editing"
        confirmLabel="Leave anyway"
        onConfirm={handleConfirmLeave}
      />

      {/* Google Fonts for studio preview */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      />

      <WidgetStudioTopbar
        name={draft.name}
        onRename={(name) => setName(widgetId, name)}
        dirty={dirty}
        isFirstRun={isFirstRun}
        isWall={draft.kind === "wall"}
        wallSlug={draft.wall.slug}
        shareOpen={shareOpen}
        onClose={handleClose}
        onReset={handleReset}
        onSave={handleSave}
        onToggleShare={handleToggleShare}
      />

      <div className="flex min-h-0 flex-1">
        {isDesktop ? (
          <>
            <WidgetStudioRail
              slug={slug}
              activeId={widgetId}
              entries={entries}
              configs={siblingConfigs}
              items={previewItems}
              onNavigate={(id) =>
                navigateGuarded(`/projects/${slug}/widgets/${id}`)
              }
              onCreate={() =>
                navigateGuarded(`/projects/${slug}/widgets?new=1`)
              }
            />

            <aside
              className="flex h-full w-[380px] shrink-0 flex-col border-r border-border/60 bg-sidebar"
              aria-label="Widget controls"
            >
              <WidgetStudioControls widgetId={widgetId} />
            </aside>

            <main
              className="flex min-h-0 flex-1 flex-col"
              aria-label="Widget preview"
            >
              <WidgetStudioPreview
                widgetId={widgetId}
                items={previewItems}
                project={project}
              />
            </main>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Mobile body — tab views */}
            <div className="relative min-h-0 flex-1">
              <MobileTabPanel active={mobileTab === "layout"}>
                <WidgetStudioControls
                  widgetId={widgetId}
                  mobileSection="layout"
                />
              </MobileTabPanel>
              <MobileTabPanel active={mobileTab === "style"}>
                <WidgetStudioControls
                  widgetId={widgetId}
                  mobileSection="style"
                />
              </MobileTabPanel>
              <MobileTabPanel active={mobileTab === "content"}>
                <WidgetStudioControls
                  widgetId={widgetId}
                  mobileSection="content"
                />
              </MobileTabPanel>
              <MobileTabPanel active={mobileTab === "preview"}>
                <WidgetStudioPreview
                  widgetId={widgetId}
                  items={previewItems}
                  project={project}
                />
              </MobileTabPanel>
            </div>

            {/* Bottom tab bar */}
            <div
              className="flex h-12 shrink-0 border-t border-border/60 bg-background"
              role="tablist"
              aria-label="Studio panels"
            >
              <MobileTabButton
                tab="layout"
                Icon={RowsIcon}
                label="Layout"
                active={mobileTab === "layout"}
                onClick={() => setMobileTab("layout")}
              />
              <MobileTabButton
                tab="style"
                Icon={PaintIcon}
                label="Style"
                active={mobileTab === "style"}
                onClick={() => setMobileTab("style")}
              />
              <MobileTabButton
                tab="content"
                Icon={ListIcon}
                label="Content"
                active={mobileTab === "content"}
                onClick={() => setMobileTab("content")}
              />
              <MobileTabButton
                tab="preview"
                Icon={EyeIcon}
                label="Preview"
                active={mobileTab === "preview"}
                onClick={() => setMobileTab("preview")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right-side share drawer (overlays preview) */}
      <WidgetShareDrawer
        widgetId={widgetId}
        open={shareOpen}
        onOpenChange={(open: boolean) => setQuery({ share: open ? "1" : null })}
      />
    </div>
  );
}

function MobileTabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden",
        active ? "visible" : "invisible",
      )}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

function MobileTabButton({
  Icon,
  label,
  active,
  onClick,
}: {
  tab: MobileTab;
  Icon: PhosphorIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-muted/40 text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" weight="bold" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
