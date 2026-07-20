import {
  WIDGET_SCHEMA_VERSION,
  widgetDefinitionDocSchema,
  type WidgetDefinitionDoc,
  type WidgetKind,
} from "./definition.js";

type Rec = Record<string, unknown>;

function rec(value: unknown): Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Rec)
    : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function arr(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function projectKind(raw: unknown): WidgetKind {
  const value = str(raw).toUpperCase();
  return value === "WALL_OF_LOVE" || value === "WALL" ? "wall" : "embed";
}

function projectAppearance(raw: unknown): "light" | "dark" | "system" {
  const value = str(raw).toUpperCase();
  if (value === "DARK") return "dark";
  if (value === "AUTO" || value === "SYSTEM") return "system";
  return "light";
}

function projectBrandColor(raw: Rec): string {
  const candidate = str(raw.accent ?? raw.accentColor ?? raw.brandColor);
  return /^#[0-9a-fA-F]{3,6}$/.test(candidate) ? candidate : "#4338ca";
}

/**
 * v1 layout preset/variant → v2 template + accents. The five presets map onto
 * the roster 1:1; variants became each template's accent decision.
 */
const V1_LAYOUT_TO_TEMPLATE: Record<
  string,
  { templateId: string; accentKey?: string; variantAccent?: Record<string, string> }
> = {
  carousel: {
    templateId: "marquee",
    accentKey: "mode",
    variantAccent: { spotlight: "spotlight", classic: "cards" },
  },
  grid: {
    templateId: "gallery",
    accentKey: "lead",
    variantAccent: { featured: "featured", classic: "uniform" },
  },
  masonry: {
    templateId: "mosaic",
    accentKey: "weave",
    variantAccent: { dense: "dense", classic: "airy" },
  },
  list: {
    templateId: "column",
    accentKey: "voice",
    variantAccent: { quotes: "quotes", classic: "cards" },
  },
  wall: {
    templateId: "editorial",
    accentKey: "rhythm",
    variantAccent: { editorial: "calm", classic: "staggered" },
  },
};

function projectLayoutToTemplate(layout: Rec): {
  templateId: string;
  accents: Record<string, string>;
} {
  const preset = str(layout.preset, "carousel");
  const variant = str(layout.variant, "classic");
  const mapping = V1_LAYOUT_TO_TEMPLATE[preset] ?? V1_LAYOUT_TO_TEMPLATE.carousel!;
  const accents: Record<string, string> = {};
  if (mapping.accentKey) {
    const value = mapping.variantAccent?.[variant];
    if (value) accents[mapping.accentKey] = value;
  }
  return { templateId: mapping.templateId, accents };
}

/**
 * Project a v1 doc (layout preset/variant + raw 9-knob theme) onto the v2
 * template contract. Lossy by design: brand facts survive
 * (`theme.brandColor/appearance` → `brand`); the other theme knobs were owner
 * taste that now belongs to the template manifest and drop.
 */
function projectV1ToV2(candidate: Rec): WidgetDefinitionDoc {
  const theme = rec(candidate.theme);
  const { templateId, accents } = projectLayoutToTemplate(rec(candidate.layout));
  return widgetDefinitionDocSchema.parse({
    schemaVersion: WIDGET_SCHEMA_VERSION,
    kind: candidate.kind,
    templateId,
    accents,
    brand: {
      color: projectBrandColor(theme),
      appearance: projectAppearance(theme.appearance),
    },
    content: candidate.content,
    display: candidate.display,
    behavior: candidate.behavior,
    branding: candidate.branding,
    wall: candidate.wall ?? null,
  });
}

const FLAT_LAYOUT_PRESETS: Record<string, string> = {
  GRID: "grid",
  MASONRY: "masonry",
  LIST: "list",
  WALL: "wall",
};

function projectFlatPreset(cfg: Rec, kind: WidgetKind): string {
  const layoutStr = str(cfg.layout ?? cfg.layoutType).toUpperCase();
  return FLAT_LAYOUT_PRESETS[layoutStr] ?? (kind === "wall" ? "wall" : "carousel");
}

function projectFlatContent(cfg: Rec): Rec {
  const content = rec(cfg.content);
  const order = str(content.order).toLowerCase();
  return {
    mode:
      str(cfg.contentMode ?? content.mode).toLowerCase() === "handpicked"
        ? "handpicked"
        : "all",
    pickedIds: arr(cfg.pickedIds ?? content.pickedIds),
    order: ["rating", "manual", "shuffle"].includes(order) ? order : "recent",
    minRating: typeof content.minRating === "number" ? content.minRating : null,
    maxItems: num(cfg.maxItems ?? rec(cfg.behavior).maxItems, 9),
  };
}

function projectFlatWall(cfg: Rec, kind: WidgetKind, preset: string): Rec | null {
  if (kind !== "wall" && preset !== "wall") return null;
  const wall = rec(cfg.wall);
  return {
    slug: str(cfg.wallSlug ?? wall.slug) || "wall-of-love",
    title: str(cfg.wallTitle ?? wall.title, "Loved by customers"),
    subhead: str(cfg.wallSubhead ?? wall.subhead, ""),
  };
}

/**
 * Project the pre-v1 flat widget config (legacy DB mirrors / studio zustand
 * shapes) straight onto v2.
 */
export function projectFlatWidgetToV2(raw: unknown): WidgetDefinitionDoc {
  const cfg = rec(raw);
  const themeSource = { ...cfg, ...rec(cfg.tokens) };
  const kind = projectKind(cfg.kind ?? cfg.widgetType);
  const preset = projectFlatPreset(cfg, kind);
  const { templateId, accents } = projectLayoutToTemplate({ preset });

  return widgetDefinitionDocSchema.parse({
    schemaVersion: WIDGET_SCHEMA_VERSION,
    kind,
    templateId,
    accents,
    brand: {
      color: projectBrandColor(themeSource),
      appearance: projectAppearance(themeSource.theme ?? themeSource.themeMode),
    },
    content: projectFlatContent(cfg),
    display: {
      showRating: bool(cfg.showRating ?? rec(cfg.visibility).showRating, true),
      showAvatar: bool(cfg.showAvatar ?? rec(cfg.visibility).showAvatar, true),
      showCompany: bool(
        cfg.showCompany ?? rec(cfg.visibility).showCompany,
        true,
      ),
      showDate: bool(cfg.showDate ?? rec(cfg.visibility).showDate, false),
      showSource: bool(cfg.showSource ?? rec(cfg.visibility).showSource, false),
    },
    behavior: {
      autoRotate: bool(cfg.autoRotate ?? rec(cfg.behavior).autoRotate, true),
      rotateInterval: num(
        cfg.rotateInterval ?? rec(cfg.behavior).rotateInterval,
        5000,
      ),
    },
    branding: {
      logoUrl: str(cfg.logoUrl ?? rec(cfg.branding).logoUrl) || null,
      watermark: bool(cfg.showBranding ?? rec(cfg.branding).watermark, true),
    },
    wall: projectFlatWall(cfg, kind, preset),
  });
}

export function migrateWidgetDoc(raw: unknown): WidgetDefinitionDoc {
  const candidate = rec(raw);
  if (candidate.schemaVersion === WIDGET_SCHEMA_VERSION) {
    return widgetDefinitionDocSchema.parse(candidate);
  }
  if (candidate.schemaVersion === 1) {
    return projectV1ToV2(candidate);
  }
  if (typeof candidate.schemaVersion === "number") {
    throw new Error(
      `Unknown widget schemaVersion ${String(candidate.schemaVersion)} - no migration registered`,
    );
  }
  return projectFlatWidgetToV2(raw);
}
