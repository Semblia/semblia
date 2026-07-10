"use client";

/**
 * WidgetPreviewClient — the widget's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT's
 * fragment at real size in the real viewport — no scaling, no frames. Walls
 * render as their hosted page; embeds sit on a clean neutral page.
 */

import * as React from "react";
import type { WidgetDefinitionDoc } from "@workspace/widgets-core/schema";
import { useProject, useWidget, useWidgetDraft } from "@/hooks/api";
import { dtoToWidgetStudioConfig } from "@/lib/widgets/dto-adapter";
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
  widgetContentDark,
  ShadowWidgetFragment,
} from "./widget-canvas";

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
            definition: draftDoc as unknown as WidgetDefinitionDoc,
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

  const fragmentHtml = React.useMemo(() => {
    if (!resolvedConfig) return "";
    return renderStudioFragment({
      widgetId,
      draft: resolvedConfig,
      items: renderedItems,
    });
  }, [resolvedConfig, widgetId, renderedItems]);

  // fixed inset-0 z-50: the route lives inside the (app) shell — cover it,
  // same escape the StudioFrame uses.
  const gone = widgetQuery.isError || projectQuery.isError;
  if (gone || config === "error") {
    return <PreviewNotice message="This widget no longer exists." />;
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
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </main>
    );
  }

  return (
    <WidgetPreviewSurface
      backHref={`/projects/${slug}/widgets/${widgetId}`}
      config={resolvedConfig}
      scheme={scheme}
      html={fragmentHtml}
      setQuery={setQuery}
    />
  );
}

/** The rendered page once the saved config is ready. */
function WidgetPreviewSurface({
  backHref,
  config,
  scheme,
  html,
  setQuery,
}: {
  backHref: string;
  config: WidgetStudioConfig;
  scheme: CanvasScheme;
  html: string;
  setQuery: (patch: Record<string, string | null>) => void;
}) {
  const [restartKey, setRestartKey] = React.useState(0);
  const contentDark = widgetContentDark(config.theme, scheme);
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

      <div
        key={restartKey}
        className={isWall ? undefined : "mx-auto max-w-6xl px-6 py-16"}
      >
        <ShadowWidgetFragment html={html} />
      </div>
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
