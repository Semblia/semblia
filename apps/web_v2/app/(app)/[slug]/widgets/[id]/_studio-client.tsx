"use client";

import { WidgetStudioShell } from "@/components/widgets/studio/widget-studio-shell";

export function WidgetStudioClient({
  slug,
  widgetId,
}: {
  slug: string;
  widgetId: string;
}) {
  return <WidgetStudioShell slug={slug} widgetId={widgetId} />;
}
