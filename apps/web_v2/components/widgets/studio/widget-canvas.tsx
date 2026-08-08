"use client";

/**
 * WidgetCanvas — the Widget Studio's editing stage.
 *
 * Renders the draft's published fragment (the exact embed output) in a shadow
 * root inside the controlled StudioCanvas: true device width, visible zoom,
 * honest frame. Embed widgets sit on the believable host-page chrome; walls
 * render as their hosted page.
 *
 * Scheme model: the dock toggles the HOST page's scheme. A widget with a
 * fixed theme keeps its own colors regardless (that's the truth of an embed);
 * a "system" widget follows the page.
 */

import * as React from "react";
import type { V2ProjectDTO } from "@workspace/types";
import { useApprovedResponses } from "@/hooks/api";
import { selectPreviewTestimonials } from "@/lib/widgets/widget-fallback-testimonials";
import { responseToTestimonial } from "@/lib/widgets/response-to-testimonial";
import {
  composePublishedWidgetDoc,
  publishWidgetDefinition,
  type WidgetPublishedSnapshot,
} from "@workspace/widgets-core/schema";
import {
  renderPublishedWidgetFragment,
  type WidgetRenderItem,
} from "@workspace/widgets-core/render";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import type {
  WidgetDevice,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { faviconForUrl } from "@/lib/favicon";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  StudioCanvas,
  CANVAS_DEVICES,
  type CanvasScheme,
} from "@/components/studio/studio-canvas";
import { HostPageChrome } from "../preview-renderers/host-page-chrome";
import {
  WallShell,
  wallToneFromTheme,
  type WallShellStats,
} from "@/components/walls/wall-shell";

const DEVICES = [
  CANVAS_DEVICES.desktop,
  CANVAS_DEVICES.tablet,
  CANVAS_DEVICES.mobile,
];

/** Stands in for the first frame, before the draft has been published once. */
const EMPTY_THEME = {
  appearance: "light",
  schemes: {},
} as WidgetPublishedSnapshot["derivedTheme"];

/** Fixed-theme widgets keep their own colors; "system" follows the page. */
export function widgetContentDark(
  theme: WidgetStudioConfig["theme"],
  scheme: CanvasScheme,
): boolean {
  return theme === "dark" || (theme === "system" && scheme === "dark");
}

/**
 * Whether the *wall page shell* should be dark.
 *
 * A wall has no host page, so the dock's scheme switch is not the signal here:
 * a "system" wall resolves through `prefers-color-scheme` inside its shadow
 * root, and a media feature can't be overridden per element. Reading the same
 * preference is what keeps the shell and the fragment agreeing — otherwise a
 * system wall renders a dark deck inside a light page, which reads as broken
 * rather than as either theme.
 */
export function useWallShellDark(theme: WidgetStudioConfig["theme"]): boolean {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return prefersDark;
}

/**
 * Real approved + published testimonials for the preview, topped up by the
 * curated fallback when a project has too few to read well. Shared by the
 * studio shell and the preview route.
 */
export function useApprovedPreviewItems(slug: string): {
  real: WidgetTestimonial[];
  items: WidgetTestimonial[];
} {
  const approvedQuery = useApprovedResponses(slug);
  const real = React.useMemo(
    () =>
      (approvedQuery.data ?? [])
        .map(responseToTestimonial)
        .filter((t): t is WidgetTestimonial => t !== null),
    [approvedQuery.data],
  );
  const items = React.useMemo(
    () => selectPreviewTestimonials(real, 12).items,
    [real],
  );
  return { real, items };
}

export function WidgetCanvas({
  widgetId,
  items,
  project,
}: {
  widgetId: string;
  items: WidgetTestimonial[];
  project: V2ProjectDTO;
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const device = useWidgetStudioStore((s) => s.device);
  const setDevice = useWidgetStudioStore((s) => s.setDevice);
  const [scheme, setScheme] = React.useState<CanvasScheme>("light");
  const wallShellDark = useWallShellDark(draft?.theme ?? "system");

  // Defer the draft for the expensive path (fragment HTML + shadow-root
  // rebuild) so inspector edits commit at input priority and the preview
  // trails as a low-priority update.
  const deferredDraft = React.useDeferredValue(draft);

  const renderedItems = usePickedItems(deferredDraft, items);

  const rendered = React.useMemo(() => {
    if (!deferredDraft) return null;
    return renderStudioFragment({
      widgetId,
      draft: deferredDraft,
      items: renderedItems,
    });
  }, [widgetId, deferredDraft, renderedItems]);

  if (!draft) return null;

  const isWall = draft.kind === "wall";
  const contentDark = widgetContentDark(draft.theme, scheme);

  return (
    <StudioCanvas<WidgetDevice>
      devices={DEVICES}
      device={device}
      onDeviceChange={setDevice}
      scheme={scheme}
      onSchemeChange={setScheme}
      schemeHint={draft.theme === "system" ? "follows the page" : undefined}
      frameLabel={
        isWall
          ? `semblia.com/wall/${draft.wall.slug}`
          : `${project.name} · embedded`
      }
      // An embed is an in-flow element of the host page, not a page of its
      // own — the frame hugs the content instead of scrolling inside itself.
      fitHeight={!isWall}
    >
      {isWall ? (
        <WallCanvasBody
          rendered={rendered}
          dark={wallShellDark}
          eyebrow={project.name}
          wall={draft.wall}
          items={renderedItems}
        />
      ) : (
        <HostPageChrome
          hostName={project.name}
          projectType={project.projectType}
          accent={project.brandColorPrimary}
          favicon={faviconForUrl(project.websiteUrl)}
          contentDark={contentDark}
          fitContent
        >
          <ShadowWidgetFragment html={rendered?.html ?? ""} />
        </HostPageChrome>
      )}
    </StudioCanvas>
  );
}

/** A wall on the canvas: the hosted page, scrolling inside its device frame. */
function WallCanvasBody({
  rendered,
  dark,
  eyebrow,
  wall,
  items,
}: {
  rendered: ReturnType<typeof renderStudioFragment> | null;
  dark: boolean;
  eyebrow: string;
  wall: WidgetStudioConfig["wall"];
  items: WidgetTestimonial[];
}) {
  return (
    <div className="h-full overflow-y-auto">
      <WallShell
        tone={wallToneFromTheme(rendered?.themeSnapshot ?? EMPTY_THEME, dark)}
        eyebrow={eyebrow}
        title={wall.title}
        subhead={wall.subhead}
        stats={wallStatsFor(items)}
        fillViewport={false}
      >
        <ShadowWidgetFragment html={rendered?.html ?? ""} />
      </WallShell>
    </div>
  );
}

/** Handpicked content: filter + order by pickedIds; fall back to everything. */
export function usePickedItems(
  draft: WidgetStudioConfig | undefined,
  items: WidgetTestimonial[],
): WidgetTestimonial[] {
  const contentMode = draft?.content.mode;
  const pickedIdsKey = draft?.content.pickedIds.join(",") ?? "";
  return React.useMemo(() => {
    if (!draft || contentMode === "all") return items;
    if (draft.content.pickedIds.length === 0) return items;
    const map = new Map(items.map((t) => [t.id, t]));
    const ordered = draft.content.pickedIds
      .map((id) => map.get(id))
      .filter((t): t is WidgetTestimonial => Boolean(t));
    return ordered.length > 0 ? ordered : items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, contentMode, pickedIdsKey, draft]);
}

/**
 * The draft as the world will get it: the published fragment, plus the theme
 * the page shell around a wall is coloured from.
 *
 * A wall renders with `omitWallHead` and is wrapped in `WallShell`, exactly as
 * `/wall/[slug]` does. Rendering the bare fragment here instead is what made
 * the studio preview a different artifact from the live page: it drew
 * widgets-core's own centred masthead (which the live page suppresses), ran
 * full-bleed with no rail, and split the deck into five narrow columns the
 * visitor never sees.
 */
export function renderStudioFragment({
  widgetId,
  draft,
  items,
}: {
  widgetId: string;
  draft: WidgetStudioConfig;
  items: WidgetTestimonial[];
}): { html: string; themeSnapshot: WidgetPublishedSnapshot["derivedTheme"] } {
  const snapshot = publishWidgetDefinition(draft.definition);
  const doc = composePublishedWidgetDoc(draft.definition, snapshot);
  const isWall = draft.definition.kind === "wall";
  return {
    html: renderPublishedWidgetFragment(doc, {
      widgetId,
      items: items.map(toRenderItem),
      surface: isWall ? "wall" : "embed",
      omitWallHead: isWall,
    }).html,
    themeSnapshot: snapshot.derivedTheme,
  };
}

/** Rating summary for the wall masthead, matching the live page's stats. */
export function wallStatsFor(items: WidgetTestimonial[]): WallShellStats {
  const rated = items.filter(
    (t): t is WidgetTestimonial & { rating: number } =>
      typeof t.rating === "number" && t.rating > 0,
  );
  return {
    ratedCount: rated.length,
    average: rated.length
      ? Math.round(
          (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length) * 10,
        ) / 10
      : null,
  };
}

function toRenderItem(item: WidgetTestimonial): WidgetRenderItem {
  return {
    id: item.id,
    authorName: item.authorName,
    authorRole: item.authorRole,
    authorCompany: item.authorCompany,
    authorAvatarUrl: item.authorAvatar?.url ?? null,
    content: item.content,
    rating: item.rating,
    source: item.source,
    sourceUrl: item.sourceUrl,
    createdAt: item.createdAt,
  };
}

/**
 * Freezes a marquee at its first frame. A thumbnail caught mid-scroll shows a
 * rail translated to some arbitrary offset, so the row reads as chips sliced
 * off at both edges — an accurate render of a moment nobody asked to see.
 */
const FREEZE_MOTION =
  "<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>";

export function ShadowWidgetFragment({
  html,
  /** `w-full` alone lets the host size to the fragment — what a thumbnail
   *  measuring its own natural height needs. */
  className = "h-full w-full",
  /** Hold the widget on its first frame (list thumbnails). */
  frozen = false,
}: {
  html: string;
  className?: string;
  frozen?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = frozen ? html + FREEZE_MOTION : html;
  }, [html, frozen]);

  return <div ref={hostRef} className={className} />;
}
