import type { BrandThemeInputs } from "@workspace/brand-theme";
import {
  WIDGET_SCHEMA_VERSION,
  widgetDefinitionDocSchema,
  type WidgetDefinitionDoc,
  type WidgetKind,
  type WidgetLayoutPresetId,
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

const RADIUS_STOPS: Array<[number, BrandThemeInputs["radius"]]> = [
  [0, 0],
  [6, 1],
  [12, 2],
  [18, 3],
  [26, 4],
];

function nearestRadius(px: number): BrandThemeInputs["radius"] {
  let best: BrandThemeInputs["radius"] = 2;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [stop, scale] of RADIUS_STOPS) {
    const dist = Math.abs(px - stop);
    if (dist < bestDist) {
      best = scale;
      bestDist = dist;
    }
  }
  return best;
}

function projectTypePairing(value: string): BrandThemeInputs["typePairing"] {
  const family = (value.split(",")[0] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
  if (family.includes("geist")) return "geist";
  if (family.includes("inter")) return "inter";
  if (
    ["fraunces", "lora", "crimson", "playfair", "newsreader", "georgia"].some(
      (serif) => family.includes(serif),
    )
  ) {
    return "serif-editorial";
  }
  if (family.startsWith("ui-") || family.includes("system")) return "system";
  return "geist";
}

function projectKind(raw: unknown): WidgetKind {
  const value = str(raw).toUpperCase();
  return value === "WALL_OF_LOVE" || value === "WALL" ? "wall" : "embed";
}

function projectLayout(raw: unknown, kind: WidgetKind): WidgetLayoutPresetId {
  const value = str(raw).toUpperCase();
  if (value === "GRID") return "grid";
  if (value === "MASONRY") return "masonry";
  if (value === "LIST") return "list";
  if (value === "WALL") return "wall";
  return kind === "wall" ? "wall" : "carousel";
}

function projectAppearance(raw: unknown): BrandThemeInputs["appearance"] {
  const value = str(raw).toUpperCase();
  if (value === "DARK" || value === "dark") return "dark";
  if (value === "AUTO" || value === "auto" || value === "SYSTEM") return "system";
  return "light";
}

function projectSurfaceStyle(raw: unknown): BrandThemeInputs["surfaceStyle"] {
  const value = str(raw).toUpperCase();
  if (value === "FLAT") return "flat";
  if (value === "SHADOW" || value === "ELEVATED") return "elevated";
  return "bordered";
}

function projectDensity(raw: unknown): BrandThemeInputs["density"] {
  const value = str(raw).toUpperCase();
  if (value === "COMPACT") return "compact";
  if (value === "COZY") return "spacious";
  return "cozy";
}

function projectBrandColor(raw: Rec): string {
  const candidate = str(raw.accent ?? raw.accentColor ?? raw.brandColor);
  return /^#[0-9a-fA-F]{3,6}$/.test(candidate) ? candidate : "#4f46e5";
}

function projectTheme(raw: Rec): BrandThemeInputs {
  return {
    brandColor: projectBrandColor(raw),
    appearance: projectAppearance(raw.theme ?? raw.themeMode),
    radius: nearestRadius(num(raw.radius ?? raw.borderRadius, 12)),
    density: projectDensity(raw.density),
    typePairing: projectTypePairing(str(raw.fontFamily ?? raw.fontHead)),
    surfaceStyle: projectSurfaceStyle(raw.cardStyle),
    accentIntensity: "balanced",
    neutralTone: "auto",
    buttonStyle: "solid",
  };
}

export function projectFlatWidgetToV1(raw: unknown): WidgetDefinitionDoc {
  const cfg = rec(raw);
  const tokens = rec(cfg.tokens);
  const kind = projectKind(cfg.kind ?? cfg.widgetType);
  const layout = projectLayout(cfg.layout ?? cfg.layoutType, kind);
  const wall = rec(cfg.wall);
  const wallSlug = str(cfg.wallSlug ?? wall.slug);

  return widgetDefinitionDocSchema.parse({
    schemaVersion: WIDGET_SCHEMA_VERSION,
    kind,
    layout: { preset: layout },
    content: {
      mode:
        str(cfg.contentMode ?? rec(cfg.content).mode).toLowerCase() ===
        "handpicked"
          ? "handpicked"
          : "all",
      pickedIds: arr(cfg.pickedIds ?? rec(cfg.content).pickedIds),
      order:
        str(rec(cfg.content).order).toLowerCase() === "rating"
          ? "rating"
          : str(rec(cfg.content).order).toLowerCase() === "manual"
            ? "manual"
            : str(rec(cfg.content).order).toLowerCase() === "shuffle"
              ? "shuffle"
              : "recent",
      minRating:
        typeof rec(cfg.content).minRating === "number"
          ? rec(cfg.content).minRating
          : null,
      maxItems: num(cfg.maxItems ?? rec(cfg.behavior).maxItems, 9),
    },
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
    theme: projectTheme({ ...cfg, ...tokens }),
    branding: {
      logoUrl: str(cfg.logoUrl ?? rec(cfg.branding).logoUrl) || null,
      watermark: bool(cfg.showBranding ?? rec(cfg.branding).watermark, true),
    },
    wall:
      kind === "wall" || layout === "wall"
        ? {
            slug: wallSlug || "wall-of-love",
            title: str(cfg.wallTitle ?? wall.title, "Loved by customers"),
            subhead: str(cfg.wallSubhead ?? wall.subhead, ""),
          }
        : null,
  });
}

export function migrateWidgetDoc(raw: unknown): WidgetDefinitionDoc {
  const candidate = rec(raw);
  if (candidate.schemaVersion === WIDGET_SCHEMA_VERSION) {
    return widgetDefinitionDocSchema.parse(candidate);
  }
  if (typeof candidate.schemaVersion === "number") {
    throw new Error(
      `Unknown widget schemaVersion ${String(candidate.schemaVersion)} - no migration registered`,
    );
  }
  return projectFlatWidgetToV1(raw);
}
