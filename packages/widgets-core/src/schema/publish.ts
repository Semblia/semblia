import { resolveBrandThemeSnapshot } from "@workspace/brand-theme";
import {
  WIDGET_SCHEMA_VERSION,
  widgetDefinitionDocSchema,
  widgetPublishedSnapshotSchema,
  type WidgetBrandThemeInputs,
  type WidgetDefinitionDoc,
  type WidgetKind,
  type WidgetLayoutPresetId,
  type WidgetPublishedSnapshot,
} from "./definition.js";

const DEFAULT_THEME: WidgetBrandThemeInputs = {
  brandColor: "#4f46e5",
  appearance: "light",
  radius: 2,
  density: "cozy",
  typePairing: "geist",
  surfaceStyle: "bordered",
  accentIntensity: "balanced",
  neutralTone: "auto",
  buttonStyle: "solid",
};

function defaultLayoutFor(kind: WidgetKind): WidgetLayoutPresetId {
  return kind === "wall" ? "wall" : "carousel";
}

export function defaultWidgetDefinition(
  overrides: {
    kind?: WidgetKind;
    layout?: WidgetLayoutPresetId;
    brandColor?: string | null;
    wallSlug?: string | null;
  } = {},
): WidgetDefinitionDoc {
  const kind = overrides.kind ?? "embed";
  const layout = overrides.layout ?? defaultLayoutFor(kind);
  const wallSlug = overrides.wallSlug ?? "wall-of-love";

  return widgetDefinitionDocSchema.parse({
    schemaVersion: WIDGET_SCHEMA_VERSION,
    kind,
    layout: { preset: layout },
    content: {
      mode: "all",
      pickedIds: [],
      order: "recent",
      minRating: null,
      maxItems: layout === "wall" ? 12 : layout === "list" ? 5 : 9,
    },
    display: {
      showRating: true,
      showAvatar: true,
      showCompany: true,
      showDate: false,
      showSource: false,
    },
    behavior: {
      autoRotate: layout === "carousel",
      rotateInterval: 5000,
    },
    theme: {
      ...DEFAULT_THEME,
      brandColor: overrides.brandColor ?? DEFAULT_THEME.brandColor,
    },
    branding: { logoUrl: null, watermark: true },
    wall:
      kind === "wall" || layout === "wall"
        ? {
            slug: wallSlug,
            title: "Loved by people who ship",
            subhead: "Real stories from real customers.",
          }
        : null,
  });
}

export function publishWidgetDefinition(
  doc: unknown,
  opts: { resolvedAt?: Date } = {},
): WidgetPublishedSnapshot {
  const definition = widgetDefinitionDocSchema.parse(doc);
  return widgetPublishedSnapshotSchema.parse({
    derivedTheme: resolveBrandThemeSnapshot(definition.theme),
    version: "widgets-v1",
    resolvedAt: (opts.resolvedAt ?? new Date()).toISOString(),
  });
}

export function composePublishedWidgetDoc(
  doc: unknown,
  snapshot: unknown,
) {
  const definition = widgetDefinitionDocSchema.parse(doc);
  const derived = widgetPublishedSnapshotSchema.parse(snapshot);
  return { ...definition, derived };
}
