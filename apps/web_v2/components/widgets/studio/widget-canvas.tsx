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
import {
  StudioCanvas,
  CANVAS_DEVICES,
  type CanvasScheme,
} from "@/components/studio/studio-canvas";
import { HostPageChrome } from "../preview-renderers/host-page-chrome";

const DEVICES = [
  CANVAS_DEVICES.desktop,
  CANVAS_DEVICES.tablet,
  CANVAS_DEVICES.mobile,
];

/** Fixed-theme widgets keep their own colors; "system" follows the page. */
export function widgetContentDark(
  theme: WidgetStudioConfig["theme"],
  scheme: CanvasScheme,
): boolean {
  return theme === "dark" || (theme === "system" && scheme === "dark");
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

  // Defer the draft for the expensive path (fragment HTML + shadow-root
  // rebuild) so inspector edits commit at input priority and the preview
  // trails as a low-priority update.
  const deferredDraft = React.useDeferredValue(draft);

  const renderedItems = usePickedItems(deferredDraft, items);

  const fragmentHtml = React.useMemo(() => {
    if (!deferredDraft) return "";
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
    >
      {isWall ? (
        <div
          className="h-full overflow-y-auto"
          style={{ background: contentDark ? "#0a0a0b" : "#fafafa" }}
        >
          <ShadowWidgetFragment html={fragmentHtml} />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <HostPageChrome
            hostName={project.name}
            projectType={project.projectType}
            accent={project.brandColorPrimary}
            favicon={faviconForUrl(project.websiteUrl)}
            contentDark={contentDark}
          >
            <ShadowWidgetFragment html={fragmentHtml} />
          </HostPageChrome>
        </div>
      )}
    </StudioCanvas>
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

export function renderStudioFragment({
  widgetId,
  draft,
  items,
}: {
  widgetId: string;
  draft: WidgetStudioConfig;
  items: WidgetTestimonial[];
}) {
  const snapshot = publishWidgetDefinition(draft.definition);
  const doc = composePublishedWidgetDoc(draft.definition, snapshot);
  return renderPublishedWidgetFragment(doc, {
    widgetId,
    items: items.map(toRenderItem),
  }).html;
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

export function ShadowWidgetFragment({ html }: { html: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = html;
  }, [html]);

  return <div ref={hostRef} className="h-full w-full" />;
}
