"use client";

/**
 * WidgetPreviewClient — the widget's true full-page preview (its own route,
 * opened in a new tab from the studio). Renders the CURRENT SAVED DRAFT's
 * fragment at real size in the real viewport — no scaling, no frames. Walls
 * render as their hosted page; embeds sit on a clean neutral page.
 */

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { WidgetDefinitionDoc } from "@workspace/widgets-core/schema";
import {
  useProject,
  useWidget,
  useWidgetDraft,
  useApprovedResponses,
} from "@/hooks/api";
import { selectPreviewTestimonials } from "@/lib/widgets/widget-fallback-testimonials";
import { responseToTestimonial } from "@/lib/widgets/response-to-testimonial";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import {
  dtoToWidgetStudioConfig,
} from "@/lib/widgets/dto-adapter";
import { syncStudioConfig } from "@/lib/widgets/widget-presets";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import { PreviewChrome } from "@/components/studio/preview-chrome";
import type { CanvasScheme } from "@/components/studio/studio-canvas";
import {
  renderStudioFragment,
  usePickedItems,
  ShadowWidgetFragment,
} from "./widget-canvas";

export function WidgetPreviewClient({
  slug,
  widgetId,
}: {
  slug: string;
  widgetId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const projectQuery = useProject(slug);
  const widgetQuery = useWidget(slug, widgetId);
  const draftQuery = useWidgetDraft(slug, widgetId);
  const approvedQuery = useApprovedResponses(slug);

  const [restartKey, setRestartKey] = React.useState(0);

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

  // Saved draft preferred, else the published config — same seeding rule as
  // the studio shell, but read-only (no store).
  const config: WidgetStudioConfig | null = React.useMemo(() => {
    const detail = widgetQuery.data;
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
      return null;
    }
  }, [widgetQuery.data, draftQuery.isLoading, draftQuery.data]);

  const items = React.useMemo(() => {
    const real = (approvedQuery.data ?? [])
      .map(responseToTestimonial)
      .filter((t): t is WidgetTestimonial => t !== null);
    return selectPreviewTestimonials(real, 12).items;
  }, [approvedQuery.data]);

  const renderedItems = usePickedItems(config ?? undefined, items);

  const schemeParam = searchParams.get("scheme");
  const scheme: CanvasScheme = schemeParam === "dark" ? "dark" : "light";

  const fragmentHtml = React.useMemo(() => {
    if (!config) return "";
    return renderStudioFragment({
      widgetId,
      draft: config,
      items: renderedItems,
    });
  }, [config, widgetId, renderedItems]);

  if (widgetQuery.isError || projectQuery.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          This widget no longer exists.
        </p>
      </main>
    );
  }

  if (!config) {
    return (
      <main
        className="flex min-h-svh items-center justify-center bg-background"
        aria-busy
      >
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </main>
    );
  }

  const contentDark =
    config.theme === "dark" || (config.theme === "system" && scheme === "dark");
  const isWall = config.kind === "wall";

  return (
    <main
      className="min-h-svh"
      style={{ background: contentDark ? "#0a0a0b" : "#fafafa" }}
    >
      {/* Fonts for the theme's webfont options. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,300..900;1,300..900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      />

      <PreviewChrome
        backHref={`/projects/${slug}/widgets/${widgetId}`}
        scheme={scheme}
        onSchemeChange={(s) => setQuery({ scheme: s === "light" ? null : s })}
        onRestart={() => setRestartKey((k) => k + 1)}
      />

      <div
        key={restartKey}
        className={isWall ? undefined : "mx-auto max-w-6xl px-6 py-16"}
      >
        <ShadowWidgetFragment html={fragmentHtml} />
      </div>
    </main>
  );
}
