export const WIDGET_THEME_TELEMETRY_EVENTS = [
  "widgets_theme.knob_changed",
  "widgets_theme.preset_selected",
  "widgets_theme.reset_to_preset",
  "widgets_theme.published",
] as const;

export const WIDGET_VIEW_ANALYTICS_EVENTS = [
  "widgets_view.impression",
  "widgets_view.item_view",
  "widgets_view.cta_click",
] as const;

export type WidgetThemeTelemetryEvent =
  (typeof WIDGET_THEME_TELEMETRY_EVENTS)[number];
export type WidgetViewAnalyticsEvent =
  (typeof WIDGET_VIEW_ANALYTICS_EVENTS)[number];

export interface WidgetThemeTelemetryPayload {
  event: WidgetThemeTelemetryEvent;
  widgetId: string;
  projectSlug: string;
  metadata?: Record<string, unknown>;
}
