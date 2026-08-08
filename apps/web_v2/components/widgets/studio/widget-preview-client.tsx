"use client";

/**
 * WidgetPreviewClient — the widget's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT's
 * fragment at real size in the real viewport — no scaling, no frames. Walls
 * render as their hosted page; embeds sit on a clean neutral page.
 */

import * as React from "react";
import { useProject, useWidget, useWidgetDraft } from "@/hooks/api";
import { Spinner } from "@/components/ui/spinner";
import { dtoToWidgetStudioConfig } from "@/lib/widgets/dto-adapter";
import { widgetStudioPath } from "@/lib/routes";
import { syncStudioConfig } from "@/lib/widgets/widget-presets";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import {
  PreviewChrome,
  usePreviewQuery,
} from "@/components/studio/preview-chrome";
import type { CanvasScheme } from "@/components/studio/studio-canvas";
import {
  renderStudioFragment,
  usePickedItems,
  useApprovedPreviewItems,
  wallStatsFor,
  useWallShellDark,
  widgetContentDark,
  ShadowWidgetFragment,
} from "./widget-canvas";
import { WallShell, wallToneFromTheme } from "@/components/walls/wall-shell";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type { WidgetPublishedSnapshot } from "@workspace/widgets-core/schema";

/** Stands in until the draft has been published once for the preview. */
const EMPTY_PREVIEW_THEME = {
  appearance: "light",
  schemes: {},
} as WidgetPublishedSnapshot["derivedTheme"];

/**
 * Saved draft preferred, else the published config — same seeding rule as the
 * studio shell, but read-only (no store). Returns "error" when the stored doc
 * can't be converted, so the route shows a real error instead of spinning.
 */
function useSavedDraftConfig(
  detail: ReturnType<typeof useWidget>["data"],
  draftQuery: ReturnType<typeof useWidgetDraft>,
): WidgetStudioConfig | "error" | null {
  return React.useMemo(() => {
    if (!detail || draftQuery.isLoading) return null;
    try {
      const draftDoc = draftQuery.data?.draft;
      return draftDoc
        ? syncStudioConfig({
            name: detail.config.name,
            definition: draftDoc as WidgetStudioConfig["definition"],
          })
        : dtoToWidgetStudioConfig(detail.config);
    } catch {
      return "error";
    }
  }, [detail, draftQuery.isLoading, draftQuery.data]);
}

function schemeFromParam(param: string | null): CanvasScheme {
  return param === "dark" ? "dark" : "light";
}

export function WidgetPreviewClient({
  slug,
  widgetId,
}: {
  slug: string;
  widgetId: string;
}) {
  const { searchParams, setQuery } = usePreviewQuery();

  const projectQuery = useProject(slug);
  const widgetQuery = useWidget(slug, widgetId);
  const draftQuery = useWidgetDraft(slug, widgetId);

  const config = useSavedDraftConfig(widgetQuery.data, draftQuery);
  const resolvedConfig = typeof config === "object" ? config : null;
  const { items } = useApprovedPreviewItems(slug);
  const renderedItems = usePickedItems(resolvedConfig ?? undefined, items);

  const scheme = schemeFromParam(searchParams.get("scheme"));

  const rendered = React.useMemo(() => {
    if (!resolvedConfig) return null;
    return renderStudioFragment({
      widgetId,
      draft: resolvedConfig,
      items: renderedItems,
    });
  }, [resolvedConfig, widgetId, renderedItems]);

  // fixed inset-0 z-50: the route lives inside the (app) shell — cover it,
  // same escape the StudioFrame uses.
  const fetchFailed = widgetQuery.isError || projectQuery.isError;
  if (fetchFailed) {
    return (
      <PreviewNotice
        message="Couldn't load this widget."
        onRetry={() => {
          void widgetQuery.refetch();
          void projectQuery.refetch();
        }}
      />
    );
  }

  if (config === "error") {
    return (
      <PreviewNotice message="This widget's saved data couldn't be read." />
    );
  }

  if (draftQuery.isError) {
    return (
      <PreviewNotice
        message="Couldn't load the draft for this preview."
        onRetry={() => void draftQuery.refetch()}
      />
    );
  }

  if (!resolvedConfig) {
    return (
      <main
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        aria-busy
      >
        <Spinner className="size-6 text-muted-foreground" />
      </main>
    );
  }

  return (
    <WidgetPreviewSurface
      backHref={widgetStudioPath(slug, widgetId)}
      config={resolvedConfig}
      projectName={projectQuery.data?.name}
      scheme={scheme}
      rendered={rendered}
      items={renderedItems}
      setQuery={setQuery}
    />
  );
}

/** The rendered page once the saved config is ready. */
function WidgetPreviewSurface({
  backHref,
  config,
  projectName,
  scheme,
  rendered,
  items,
  setQuery,
}: {
  backHref: string;
  config: WidgetStudioConfig;
  projectName?: string;
  scheme: CanvasScheme;
  rendered: ReturnType<typeof renderStudioFragment> | null;
  items: WidgetTestimonial[];
  setQuery: (patch: Record<string, string | null>) => void;
}) {
  const [restartKey, setRestartKey] = React.useState(0);
  const contentDark = widgetContentDark(config.theme, scheme);
  const wallShellDark = useWallShellDark(config.theme);
  const isWall = config.kind === "wall";

  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: contentDark ? "#0a0a0b" : "#fafafa" }}
    >
      {/* Fonts for the theme's webfont options. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      />

      <PreviewChrome
        backHref={backHref}
        scheme={scheme}
        onSchemeChange={(s) => setQuery({ scheme: s === "light" ? null : s })}
        onRestart={() => setRestartKey((k) => k + 1)}
      />

      {/* A wall previews as the page it is — same shell the live
          /wall/[slug] route renders, so the two can't drift. */}
      {isWall ? (
        <div key={restartKey}>
          <WallShell
            tone={wallToneFromTheme(
              rendered?.themeSnapshot ?? EMPTY_PREVIEW_THEME,
              wallShellDark,
            )}
            eyebrow={projectName}
            title={config.wall.title}
            subhead={config.wall.subhead}
            stats={wallStatsFor(items)}
          >
            <ShadowWidgetFragment html={rendered?.html ?? ""} />
          </WallShell>
        </div>
      ) : (
        <div key={restartKey} className="mx-auto max-w-6xl px-6 py-16">
          <ShadowWidgetFragment html={rendered?.html ?? ""} />
        </div>
      )}
    </main>
  );
}

function PreviewNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-foreground underline-offset-2 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </main>
  );
}
