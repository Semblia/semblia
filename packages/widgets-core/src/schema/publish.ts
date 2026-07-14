import { resolveBrandThemeSnapshot } from "@workspace/brand-theme";
import {
  DEFAULT_WALL_TEMPLATE_ID,
  DEFAULT_WIDGET_TEMPLATE_ID,
  normalizeWidgetAccents,
  resolveWidgetTemplateManifest,
} from "../templates.js";
import {
  WIDGET_SCHEMA_VERSION,
  widgetDefinitionDocSchema,
  widgetPublishedSnapshotSchema,
  type WidgetDefinitionDoc,
  type WidgetKind,
  type WidgetPublishedSnapshot,
} from "./definition.js";

export function defaultWidgetDefinition(
  overrides: {
    kind?: WidgetKind;
    templateId?: string;
    brandColor?: string | null;
    wallSlug?: string | null;
  } = {},
): WidgetDefinitionDoc {
  const kind = overrides.kind ?? "embed";
  const templateId =
    overrides.templateId ??
    (kind === "wall" ? DEFAULT_WALL_TEMPLATE_ID : DEFAULT_WIDGET_TEMPLATE_ID);
  const wallSlug = overrides.wallSlug ?? "wall-of-love";

  return widgetDefinitionDocSchema.parse({
    schemaVersion: WIDGET_SCHEMA_VERSION,
    kind,
    templateId,
    accents: {},
    brand: {
      ...(overrides.brandColor ? { color: overrides.brandColor } : {}),
    },
    content: {
      mode: "all",
      pickedIds: [],
      order: "recent",
      minRating: null,
      maxItems:
        templateId === "editorial" ? 12 : templateId === "column" ? 5 : 9,
    },
    display: {
      showRating: true,
      showAvatar: true,
      showCompany: true,
      showDate: false,
      showSource: false,
    },
    behavior: {
      autoRotate: templateId === "marquee",
      rotateInterval: 5000,
    },
    branding: { logoUrl: null, watermark: true },
    wall:
      kind === "wall"
        ? {
            slug: wallSlug,
            title: "Loved by people who ship",
            subhead: "Real stories from real customers.",
          }
        : null,
  });
}

/**
 * Publish-time derivation: the template's theme recipe consumes the brand
 * facts (+ normalized accents) and resolves the AA-clamped snapshot — the
 * serve path never derives at request time.
 */
export function publishWidgetDefinition(
  doc: unknown,
  opts: { resolvedAt?: Date } = {},
): WidgetPublishedSnapshot {
  const definition = widgetDefinitionDocSchema.parse(doc);
  const manifest = resolveWidgetTemplateManifest(definition.templateId);
  const accents = normalizeWidgetAccents(manifest, definition.accents);
  return widgetPublishedSnapshotSchema.parse({
    derivedTheme: resolveBrandThemeSnapshot(
      manifest.themeInputs(
        definition.brand.color,
        definition.brand.appearance,
        accents,
      ),
    ),
    version: "widgets-v2",
    resolvedAt: (opts.resolvedAt ?? new Date()).toISOString(),
  });
}

export function composePublishedWidgetDoc(doc: unknown, snapshot: unknown) {
  const definition = widgetDefinitionDocSchema.parse(doc);
  // Stored snapshots outlive contract versions; a stale/foreign snapshot
  // falls forward to a fresh publish from the (always-migratable) definition
  // instead of crashing every consumer that serves the widget.
  const parsed = widgetPublishedSnapshotSchema.safeParse(snapshot);
  const derived = parsed.success
    ? parsed.data
    : publishWidgetDefinition(definition);
  return { ...definition, derived };
}
