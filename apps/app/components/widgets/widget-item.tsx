"use client";

/**
 * The vocabulary and action set for one widget, shared by the card and the row.
 *
 * Both views used to carry their own copy of the same 60 lines — the same five
 * actions, the same clipboard handler, the same delete dialog — and they had
 * already drifted (the row's delete copy had lost a sentence the card still
 * had). One entity means one anatomy: the two views differ in layout, never in
 * what a widget *is* or what you can do to it.
 *
 * Two behaviours worth naming:
 *
 *  1. **Nothing is offered that the contract will refuse.** A wall with no
 *     published slug has no URL to copy. That used to be a live button that
 *     fired a toast telling the user to go elsewhere; it is now disabled with
 *     the reason attached, which `ItemActionRow` renders on a hoverable wrapper
 *     because a disabled button receives no pointer events.
 *  2. **Absent ≠ zero.** `0 loads` is a fact and renders as `0`. A widget that
 *     has never been loaded says so; a timestamp we cannot parse dashes.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  CodeIcon,
  CopyIcon,
  GlobeIcon,
  LinkSimpleIcon,
  MoonStarsIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  SunIcon,
  CircleHalfIcon,
  TrashIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { type ItemAction, type StatusMeta } from "@/components/shared";
import { timeAgo } from "@/lib/format";
import { widgetStudioPath } from "@/lib/routes";
import { widgetEmbedSnippet, wallLink, wallUrl } from "@/lib/semblia-urls";
import type { WidgetListEntry } from "@/lib/widgets/widget-types";

// ── Vocabulary ───────────────────────────────────────────────────────────────

const LAYOUT_LABEL: Record<WidgetListEntry["layout"], string> = {
  carousel: "Carousel",
  grid: "Grid",
  masonry: "Masonry",
  list: "List",
  wall: "Wall",
};

/** The layout union can grow server-side before this app knows it. */
export function layoutLabel(layout: WidgetListEntry["layout"]): string {
  return LAYOUT_LABEL[layout] ?? "Custom layout";
}

const KIND_META: Record<
  WidgetListEntry["kind"],
  { label: string; icon: PhosphorIcon }
> = {
  embed: { label: "Embed", icon: CodeIcon },
  wall: { label: "Wall", icon: GlobeIcon },
};

export function kindMeta(kind: WidgetListEntry["kind"]) {
  return KIND_META[kind] ?? KIND_META.embed;
}

const THEME_META: Record<
  WidgetListEntry["theme"],
  { label: string; icon: PhosphorIcon }
> = {
  light: { label: "Light", icon: SunIcon },
  dark: { label: "Dark", icon: MoonStarsIcon },
  system: { label: "System", icon: CircleHalfIcon },
};

export function themeMeta(theme: WidgetListEntry["theme"]) {
  return THEME_META[theme] ?? THEME_META.system;
}

/**
 * Widgets have no server-side status enum — `isActive` is the whole lifecycle —
 * so this is the local registry entry for it, shaped like the shared ones so
 * both views render the one badge through `StatusBadge`.
 */
export function widgetStatusMeta(isActive: boolean): StatusMeta {
  return isActive
    ? { label: "Active", tone: "positive" }
    : { label: "Paused", tone: "neutral" };
}

/**
 * A widget that has never been served says so. An unparseable stamp dashes via
 * `timeAgo` rather than reaching the DOM as "Invalid Date".
 */
export function lastLoadLabel(lastLoadAt: number | null): string {
  if (lastLoadAt === null) return "never loaded";
  return timeAgo(new Date(lastLoadAt));
}

/** The public wall address, or `null` when this wall has not been given one. */
export function widgetWallUrl(
  entry: WidgetListEntry,
  wallSlug: string | null,
): string | null {
  if (entry.kind !== "wall" || !wallSlug) return null;
  return wallUrl(wallSlug);
}

// ── Actions ──────────────────────────────────────────────────────────────────

export interface WidgetActionContext {
  slug: string;
  entry: WidgetListEntry;
  /** Public wall slug from the widget's saved config; `null` when unset. */
  wallSlug: string | null;
  /** A write is already in flight — actions that mutate stand down. */
  busy?: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

const NO_WALL_URL_REASON =
  "This wall has no public URL yet. Open it in the studio to set one.";

/** What the share action copies, and how the success toast announces it. */
function shareContent(opts: {
  isWall: boolean;
  wallSlug: string | null;
  slug: string;
  widgetId: string;
}): { text: string; copied: string } {
  const { isWall, wallSlug, slug, widgetId } = opts;
  const text =
    isWall && wallSlug
      ? wallLink(wallSlug)
      : widgetEmbedSnippet(slug, widgetId);
  const copied = isWall ? "Wall URL copied" : "Embed snippet copied";
  return { text, copied };
}

/** The five actions every widget offers, identical in both views. */
function buildWidgetActions(opts: {
  slug: string;
  entry: WidgetListEntry;
  shareable: boolean;
  busy: boolean;
  onCopyShare: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
}): ItemAction[] {
  const { entry, shareable, busy } = opts;
  const isWall = entry.kind === "wall";
  return [
    {
      id: "edit",
      label: "Edit design",
      icon: PencilSimpleIcon,
      href: widgetStudioPath(opts.slug, entry.id),
      pinned: true,
    },
    {
      id: "share",
      // A distinct icon from Duplicate's: two "copy" actions sharing one glyph
      // is the row asking to be misread.
      label: isWall ? "Copy wall URL" : "Copy snippet",
      icon: isWall ? LinkSimpleIcon : CodeIcon,
      pinned: true,
      disabled: !shareable,
      disabledReason: shareable ? undefined : NO_WALL_URL_REASON,
      onSelect: opts.onCopyShare,
    },
    {
      id: "duplicate",
      label: "Duplicate widget",
      icon: CopyIcon,
      disabled: busy,
      onSelect: opts.onDuplicate,
    },
    {
      id: "toggle",
      label: entry.isActive ? "Pause widget" : "Activate widget",
      icon: entry.isActive ? PauseIcon : PlayIcon,
      tone: entry.isActive ? "warning" : "success",
      disabled: busy,
      onSelect: opts.onToggleActive,
    },
    {
      id: "delete",
      label: "Delete widget",
      icon: TrashIcon,
      tone: "danger",
      iconOnly: true,
      pinned: true,
      disabled: busy,
      onSelect: opts.onRequestDelete,
    },
  ];
}

function DeleteWidgetDialog({
  entry,
  open,
  onOpenChange,
  onConfirm,
}: {
  entry: WidgetListEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isWall = entry.kind === "wall";
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      intent="danger"
      title={<>Delete &ldquo;{entry.name}&rdquo;?</>}
      description={
        isWall
          ? "This permanently removes the wall. Anyone holding its address gets a missing page. This can't be undone."
          : "This permanently removes the widget. Any site embedding it stops rendering. This can't be undone."
      }
      cancelLabel="Keep widget"
      confirmLabel="Delete widget"
      onConfirm={onConfirm}
    />
  );
}

export function useWidgetActions({
  slug,
  entry,
  wallSlug,
  busy = false,
  onDuplicate,
  onDelete,
  onToggleActive,
}: WidgetActionContext): {
  actions: ItemAction[];
  deleteDialog: React.ReactNode;
} {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const isWall = entry.kind === "wall";
  const shareable = !isWall || Boolean(wallSlug);

  const handleCopyShare = React.useCallback(async () => {
    const { text, copied } = shareContent({
      isWall,
      wallSlug,
      slug,
      widgetId: entry.id,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(copied);
    } catch {
      // Clipboard access is denied in some embedded/insecure contexts. Say what
      // failed rather than pretending it worked.
      toast.error("Couldn't reach the clipboard. Copy it from the studio.");
    }
  }, [isWall, wallSlug, slug, entry.id]);

  const actions = buildWidgetActions({
    slug,
    entry,
    shareable,
    busy,
    onCopyShare: () => void handleCopyShare(),
    onDuplicate,
    onToggleActive,
    onRequestDelete: () => setDeleteOpen(true),
  });

  const deleteDialog = (
    <DeleteWidgetDialog
      entry={entry}
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      onConfirm={onDelete}
    />
  );

  return { actions, deleteDialog };
}
