"use client";

/**
 * WidgetStudioShell — the Widget Studio, now wearing the shared StudioShell and
 * driven by the same server lifecycle as the Form Studio.
 *
 * What changed from the local-only prototype:
 *   - Edits debounce-autosave to the server (StudioDraft, optimistic version),
 *     exactly like forms — no more localStorage-only persistence.
 *   - A real Publish moment stamps the live Widget.config from the draft.
 *   - Status reads Draft / Published / Unpublished changes from the server.
 *   - The bespoke 3-pane layout (sibling rail + custom topbar + section nav) is
 *     gone; the studio renders through StudioShell + StudioTopbar + StudioRail.
 *
 * The zustand store still holds the working draft (the controls read it), so the
 * shell commits the local baseline only after a successful server save.
 */

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Copy as CopyIcon,
  ArrowSquareOut as OpenIcon,
} from "@phosphor-icons/react";
import type { WidgetDefinitionDoc } from "@workspace/widgets-core/schema";
import { cn } from "@/lib/utils";
import { wallLink, wallPath } from "@/lib/semblia-urls";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  useProject,
  useWidget,
  useWidgetDraft,
  useWidgetsList,
  useSaveWidgetDraft,
  usePublishWidgetDraft,
  useUpdateWidget,
  useApprovedResponses,
} from "@/hooks/api";
import { selectPreviewTestimonials } from "@/lib/widgets/widget-fallback-testimonials";
import { responseToTestimonial } from "@/lib/widgets/response-to-testimonial";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import {
  dtoToWidgetListEntry,
  dtoToWidgetStudioConfig,
} from "@/lib/widgets/dto-adapter";
import {
  buildDefaultWidgetConfig,
  syncStudioConfig,
} from "@/lib/widgets/widget-presets";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import {
  useWidgetStudioStore,
  isWidgetDirty,
} from "@/lib/widgets/widget-studio-store";

import { StudioShell } from "@/components/studio/studio-shell";
import {
  StudioTopbar,
  type SaveState,
  type StudioStatus,
} from "@/components/studio/studio-topbar";
import {
  useStudioHotkeys,
  studioHotkeyHelp,
} from "@/components/studio/use-studio-hotkeys";
import {
  WIDGET_SECTIONS,
  WidgetInspectorPanel,
  type WidgetSectionId,
  type WidgetStudioContext,
} from "./widget-studio-controls";
import { WidgetStudioPreview } from "./widget-studio-preview";
import { WidgetShareDrawer } from "./widget-share-drawer";

const AUTOSAVE_MS = 1200;

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    (err as { status?: number }).status === 409
  );
}

interface WidgetStudioShellProps {
  slug: string;
  widgetId: string;
}

export function WidgetStudioShell({ slug, widgetId }: WidgetStudioShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // ── Store ───────────────────────────────────────────────────
  const snapshot = useWidgetStudioStore((s) => s.snapshots[widgetId]);
  const draft = snapshot?.draft;
  const dirty = useWidgetStudioStore((s) =>
    s.snapshots[widgetId] ? isWidgetDirty(s.snapshots[widgetId]) : false,
  );
  const isFirstRun = snapshot?.isFirstRun ?? false;

  const setWidgets = useWidgetStudioStore((s) => s.setWidgets);
  const hydrateWidget = useWidgetStudioStore((s) => s.hydrateWidget);
  const commitSaved = useWidgetStudioStore((s) => s.save);
  const setName = useWidgetStudioStore((s) => s.setName);
  const clearFirstRun = useWidgetStudioStore((s) => s.clearFirstRun);

  // ── URL state ───────────────────────────────────────────────
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

  // ── Section nav ─────────────────────────────────────────────
  const [section, setSection] = React.useState<WidgetSectionId>("setup");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // ── Leave guard ─────────────────────────────────────────────
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const pendingNavRef = React.useRef<string | null>(null);

  // ── Data ────────────────────────────────────────────────────
  const projectQuery = useProject(slug);
  const project = projectQuery.data ?? null;
  const accent = project?.brandColorPrimary ?? "#6366f1";

  const listQuery = useWidgetsList(slug);
  const widgetQuery = useWidget(slug, widgetId);
  const draftQuery = useWidgetDraft(slug, widgetId);

  const saveMutation = useSaveWidgetDraft(slug, widgetId);
  const publishMutation = usePublishWidgetDraft(slug, widgetId);
  const renameMutation = useUpdateWidget(slug, widgetId);

  // Optimistic draft version (StudioDraft.version) + publish state.
  const versionRef = React.useRef<number>(0);
  const [hasUnpublished, setHasUnpublished] = React.useState(false);
  const seededRef = React.useRef(false);

  // Feed the rail's slug map so findSlugForWidget works for content controls.
  React.useEffect(() => {
    if (!listQuery.data) return;
    setWidgets(
      slug,
      listQuery.data.map((dto) => dtoToWidgetListEntry(dto.entry, accent)),
    );
  }, [listQuery.data, slug, accent, setWidgets]);

  // Seed an editable snapshot (saved draft preferred, else published config).
  React.useEffect(() => {
    if (snapshot) return;
    const detail = widgetQuery.data;
    if (!detail) return;
    if (draftQuery.isLoading) return;

    let config: WidgetStudioConfig;
    try {
      const draftDoc = draftQuery.data?.draft;
      config = draftDoc
        ? syncStudioConfig({
            name: detail.config.name,
            definition: draftDoc as unknown as WidgetDefinitionDoc,
          })
        : dtoToWidgetStudioConfig(detail.config);
    } catch {
      const listEntry = dtoToWidgetListEntry(detail.entry, accent);
      config = buildDefaultWidgetConfig({
        kind: listEntry.kind,
        layout: listEntry.layout,
        projectSlug: slug,
        projectBrandColor: accent,
        name: detail.config.name,
      });
    }

    hydrateWidget(slug, widgetId, config, {
      isFirstRun: firstRunFlag,
      base: {
        isActive: detail.entry.isActive,
        createdAt: Date.parse(detail.entry.createdAt),
        updatedAt: Date.parse(detail.entry.updatedAt),
        metrics: {
          totalLoads: detail.entry.totalLoads,
          avgLoadMs: detail.entry.avgLoadMs,
          lastLoadAt: detail.entry.lastLoadAt
            ? Date.parse(detail.entry.lastLoadAt)
            : null,
        },
      },
    });
  }, [
    snapshot,
    widgetQuery.data,
    draftQuery.isLoading,
    draftQuery.data,
    slug,
    widgetId,
    accent,
    firstRunFlag,
    hydrateWidget,
  ]);

  // Seed version + unpublished state once the server draft resolves.
  React.useEffect(() => {
    if (seededRef.current) return;
    if (draftQuery.isLoading || !draftQuery.data) return;
    seededRef.current = true;
    const v = draftQuery.data.version ?? 0;
    versionRef.current = v;
    setHasUnpublished(v > 0 && v !== draftQuery.data.publishedVersion);
  }, [draftQuery.isLoading, draftQuery.data]);

  // Real approved + published testimonials. The inspector's Content panel gets
  // only the real ones (hand-picking a sample would be a lie); the preview
  // tops them up with the curated fallback when a project has too few to
  // read well.
  const approvedQuery = useApprovedResponses(slug);
  const realItems = React.useMemo(
    () =>
      (approvedQuery.data ?? [])
        .map(responseToTestimonial)
        .filter((t): t is WidgetTestimonial => t !== null),
    [approvedQuery.data],
  );
  const previewItems = React.useMemo(
    () => selectPreviewTestimonials(realItems, 12).items,
    [realItems],
  );

  // ── Save (autosave + manual) ────────────────────────────────
  const dirtyRef = React.useRef(dirty);
  const draftRef = React.useRef(draft);
  React.useEffect(() => {
    dirtyRef.current = dirty;
    draftRef.current = draft;
  });

  const doSave = React.useCallback(async () => {
    const current = draftRef.current;
    if (!current || !dirtyRef.current || saveMutation.isPending) return;
    try {
      const result = await saveMutation.mutateAsync({
        draft: current.definition as unknown as Record<string, unknown>,
        expectedVersion: versionRef.current,
      });
      versionRef.current = result.version;
      setHasUnpublished(true);
      commitSaved(widgetId); // local baseline → clears dirty
    } catch (err) {
      if (isConflict(err)) {
        toast.error("This widget changed elsewhere — reloading the latest.");
        seededRef.current = false;
        draftQuery.refetch();
      } else {
        toast.error("Couldn't save. Retrying shortly.");
      }
    }
  }, [saveMutation, commitSaved, widgetId, draftQuery]);

  // Debounced autosave on every edit.
  React.useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => void doSave(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [dirty, draft, doSave]);

  // ── Publish ─────────────────────────────────────────────────
  const doPublish = React.useCallback(async () => {
    if (dirtyRef.current) await doSave();
    if (versionRef.current === 0) {
      toast("Nothing to publish yet — make a change first.");
      return;
    }
    try {
      await publishMutation.mutateAsync({
        expectedVersion: versionRef.current,
      });
      setHasUnpublished(false);
      toast.success("Published — your widget is live.");
      if (snapshot?.isFirstRun) {
        setQuery({ share: "1" });
        clearFirstRun(widgetId);
      }
    } catch (err) {
      if (isConflict(err)) {
        toast.error("This widget changed elsewhere — reloading the latest.");
        seededRef.current = false;
        draftQuery.refetch();
      } else {
        toast.error("Couldn't publish. Check your widget and try again.");
      }
    }
  }, [
    doSave,
    publishMutation,
    snapshot,
    setQuery,
    clearFirstRun,
    widgetId,
    draftQuery,
  ]);

  // ── Cmd/Ctrl+S ──────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirtyRef.current) void doSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSave]);

  // ── beforeunload guard ──────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Initial focus ───────────────────────────────────────────
  React.useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Drop the firstRun param from the URL once consumed.
  React.useEffect(() => {
    if (firstRunFlag) {
      const t = window.setTimeout(() => setQuery({ firstRun: null }), 600);
      return () => window.clearTimeout(t);
    }
  }, [firstRunFlag, setQuery]);

  // ── Navigation ──────────────────────────────────────────────
  const navigateGuarded = React.useCallback(
    (href: string) => {
      if (dirtyRef.current) {
        pendingNavRef.current = href;
        setLeaveOpen(true);
        return;
      }
      router.push(href);
    },
    [router],
  );
  const handleClose = React.useCallback(
    () => navigateGuarded(`/projects/${slug}/widgets`),
    [slug, navigateGuarded],
  );
  const handleConfirmLeave = React.useCallback(() => {
    setLeaveOpen(false);
    if (pendingNavRef.current) {
      router.push(pendingNavRef.current);
      pendingNavRef.current = null;
    }
  }, [router]);

  const handleRename = React.useCallback(
    (name: string) => {
      setName(widgetId, name);
      renameMutation.mutate({ name });
    },
    [setName, widgetId, renameMutation],
  );

  // Context the Setup / Content / Publish panels need. Memoized so the
  // memoized inspector panel isn't re-rendered by unrelated shell state.
  const isActive = widgetQuery.data?.entry.isActive ?? false;
  const studio = React.useMemo<WidgetStudioContext>(() => {
    const status: StudioStatus = hasUnpublished
      ? { tone: "changes", label: "Unpublished changes" }
      : isActive
        ? { tone: "live", label: "Published" }
        : { tone: "draft", label: "Paused" };
    return {
      approved: realItems,
      status,
      publishing: publishMutation.isPending,
      onPublish: () => void doPublish(),
      onRename: handleRename,
    };
  }, [
    realItems,
    hasUnpublished,
    isActive,
    publishMutation.isPending,
    doPublish,
    handleRename,
  ]);

  useStudioHotkeys({
    sections: WIDGET_SECTIONS,
    onSectionChange: setSection,
    onPublish: () => void doPublish(),
    onToggleHelp: () => setHelpOpen((v) => !v),
  });

  // ── Loading / error ─────────────────────────────────────────
  if (
    widgetQuery.isLoading ||
    (!widgetQuery.isError && !snapshot) ||
    (!project && !projectQuery.isError)
  ) {
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

  if (widgetQuery.isError || !draft || !project) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
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

  const saveState: SaveState = saveMutation.isPending
    ? "saving"
    : dirty
      ? "unsaved"
      : "saved";

  const isWall = draft.kind === "wall";

  return (
    <>
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

      {/* Google Fonts for the studio preview's webfont options. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      />

      <StudioShell
        ariaLabel="Widget Studio"
        rootRef={dialogRef}
        sections={WIDGET_SECTIONS}
        activeSection={section}
        onSectionChange={setSection}
        renderInspector={(id) => (
          <WidgetInspectorPanel
            widgetId={widgetId}
            section={id}
            studio={studio}
          />
        )}
        preview={
          <WidgetStudioPreview
            widgetId={widgetId}
            items={previewItems}
            project={project}
          />
        }
        topbar={
          <StudioTopbar
            backLabel="Widgets"
            onBack={handleClose}
            name={draft.name}
            onRename={handleRename}
            dirty={dirty}
            status={studio.status}
            saveState={saveState}
            help={{
              shortcuts: studioHotkeyHelp(WIDGET_SECTIONS.length),
              tip: "Edits autosave as you type. Publish pushes them live to every embed.",
              open: helpOpen,
              onOpenChange: setHelpOpen,
            }}
            center={isWall ? <WallUrlPill slug={draft.wall.slug} /> : undefined}
            publish={{
              onPublish: () => void doPublish(),
              publishing: publishMutation.isPending,
              label: "Publish",
            }}
            share={{
              onShare: () => setQuery({ share: shareOpen ? null : "1" }),
              active: shareOpen,
              pulse: isFirstRun,
            }}
          />
        }
      />

      <WidgetShareDrawer
        widgetId={widgetId}
        open={shareOpen}
        onOpenChange={(open: boolean) => setQuery({ share: open ? "1" : null })}
      />
    </>
  );
}

function WallUrlPill({ slug }: { slug: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallLink(slug));
      toast.success("Wall URL copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1",
          "font-mono text-[10.5px] tracking-tight text-foreground",
          "transition-[border-color,background] duration-150 hover:border-foreground/30 hover:bg-muted/60",
        )}
      >
        <span
          className="size-1.5 rounded-full bg-brand ring-2 ring-brand/20"
          aria-hidden
        />
        <span className="text-muted-foreground">semblia.com/wall/</span>
        <span className="font-semibold">{slug}</span>
        <CopyIcon
          className="size-3 text-muted-foreground/70 transition-colors group-hover:text-foreground"
          weight="bold"
          aria-hidden
        />
      </button>
      <a
        // Relative path so "open" works on every deployment, not just prod.
        href={wallPath(slug)}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        aria-label="Open wall in new tab"
      >
        <OpenIcon className="size-3" weight="bold" aria-hidden />
      </a>
    </div>
  );
}
