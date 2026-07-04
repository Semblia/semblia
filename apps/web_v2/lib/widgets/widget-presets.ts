import {
  defaultWidgetDefinition,
  projectFlatWidgetToV1,
  widgetDefinitionDocSchema,
  type WidgetBrandThemeInputs,
  type WidgetDefinitionDoc,
} from "@workspace/widgets-core/schema";
import { resolveBrandTheme } from "@workspace/widgets-core/theme";
import type {
  WallConfig,
  WidgetBehavior,
  WidgetCardStyle,
  WidgetContentConfig,
  WidgetDensity,
  WidgetDesignTokens,
  WidgetKind,
  WidgetLayout,
  WidgetStudioConfig,
  WidgetTheme,
  WidgetVisibility,
} from "./widget-types";

export interface FontChoice {
  value: WidgetBrandThemeInputs["typePairing"];
  label: string;
}

export const FONT_CHOICES: FontChoice[] = [
  { value: "inherit", label: "Host page" },
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
  { value: "system", label: "System" },
  { value: "serif-editorial", label: "Editorial serif" },
];

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

export interface StylePreset {
  id: string;
  label: string;
  sub: string;
  theme: WidgetBrandThemeInputs;
  tokens: WidgetDesignTokens;
}

const PRESET_THEMES: Array<Omit<StylePreset, "tokens">> = [
  {
    id: "clean",
    label: "Clean",
    sub: "Neutral, crisp, easy to scan",
    theme: { ...DEFAULT_THEME, brandColor: "#0f172a" },
  },
  {
    id: "editorial",
    label: "Editorial",
    sub: "Warm surfaces and serif voice",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#b5441f",
      radius: 1,
      density: "spacious",
      typePairing: "serif-editorial",
      surfaceStyle: "flat",
      neutralTone: "warm",
      buttonStyle: "soft",
    },
  },
  {
    id: "launch",
    label: "Launch",
    sub: "High-signal blue with lifted cards",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#1d4ed8",
      radius: 3,
      surfaceStyle: "elevated",
      accentIntensity: "bold",
      neutralTone: "cool",
    },
  },
  {
    id: "soft",
    label: "Soft",
    sub: "Rounded, friendly, warm brand tint",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#f97316",
      radius: 4,
      density: "spacious",
      surfaceStyle: "bordered",
      neutralTone: "warm",
      buttonStyle: "soft",
    },
  },
  {
    id: "mono",
    label: "Mono",
    sub: "Minimal black-on-white proof",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#111111",
      radius: 1,
      density: "compact",
      typePairing: "system",
      surfaceStyle: "flat",
      neutralTone: "pure",
      accentIntensity: "subtle",
    },
  },
  {
    id: "noir",
    label: "Noir",
    sub: "Dark, vivid, presentation-ready",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#84cc16",
      appearance: "dark",
      radius: 2,
      surfaceStyle: "elevated",
      accentIntensity: "bold",
      neutralTone: "cool",
    },
  },
  {
    id: "slate",
    label: "Slate",
    sub: "Cool, composed, enterprise-calm",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#334155",
      radius: 2,
      density: "compact",
      typePairing: "inter",
      surfaceStyle: "bordered",
      accentIntensity: "subtle",
      neutralTone: "cool",
      buttonStyle: "outline",
    },
  },
  {
    id: "forest",
    label: "Forest",
    sub: "Grounded green, quietly confident",
    theme: {
      ...DEFAULT_THEME,
      brandColor: "#15803d",
      radius: 3,
      density: "cozy",
      typePairing: "geist",
      surfaceStyle: "flat",
      accentIntensity: "balanced",
      neutralTone: "warm",
      buttonStyle: "soft",
    },
  },
];

export const STYLE_PRESET_LIST: StylePreset[] = PRESET_THEMES.map((preset) => ({
  ...preset,
  tokens: themeInputsToTokens(preset.theme, preset.id),
}));

export const STYLE_PRESETS: Record<string, StylePreset> = Object.fromEntries(
  STYLE_PRESET_LIST.map((preset) => [preset.id, preset]),
);

export const DEFAULT_VISIBILITY: WidgetVisibility = {
  showRating: true,
  showAvatar: true,
  showCompany: true,
  showDate: false,
  showSource: false,
};

export const DEFAULT_BEHAVIOR: WidgetBehavior = {
  maxItems: 9,
  autoRotate: true,
  rotateInterval: 5000,
  showBranding: true,
};

export const DEFAULT_CONTENT: WidgetContentConfig = {
  mode: "all",
  pickedIds: [],
};

const LAYOUT_BEHAVIOR_OVERRIDES: Partial<
  Record<WidgetLayout, Partial<WidgetBehavior>>
> = {
  carousel: { autoRotate: true, maxItems: 6 },
  grid: { autoRotate: false, maxItems: 6 },
  masonry: { autoRotate: false, maxItems: 9 },
  list: { autoRotate: false, maxItems: 5 },
  wall: { autoRotate: false, maxItems: 12 },
};

const LAYOUT_DEFAULT_FOR_KIND: Record<WidgetKind, WidgetLayout> = {
  embed: "carousel",
  wall: "wall",
};

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "settings",
  "signup",
  "wall",
  "widgets",
  "www",
]);

export const DENSITY_OPTIONS: WidgetDensity[] = ["compact", "cozy", "spacious"];

export const CARD_STYLES: WidgetCardStyle[] = ["flat", "bordered", "elevated"];

export const RADIUS_OPTIONS: Array<WidgetBrandThemeInputs["radius"]> = [
  0, 1, 2, 3, 4,
];

export function buildDefaultWallConfig(projectSlug: string): WallConfig {
  const safe = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const slug = RESERVED_SLUGS.has(safe) ? `${safe}-wall` : `${safe}-love`;
  return {
    slug,
    title: "Loved by people who ship",
    subhead: "Real stories from real customers.",
  };
}

export function buildDefaultWidgetConfig(opts: {
  kind: WidgetKind;
  layout?: WidgetLayout;
  projectSlug: string;
  projectBrandColor?: string | null;
  name?: string;
}): WidgetStudioConfig {
  const layout = opts.layout ?? LAYOUT_DEFAULT_FOR_KIND[opts.kind];
  const wall = buildDefaultWallConfig(opts.projectSlug);
  const definition = defaultWidgetDefinition({
    kind: opts.kind,
    layout,
    brandColor: opts.projectBrandColor ?? DEFAULT_THEME.brandColor,
    wallSlug: wall.slug,
  });
  const behavior = {
    ...DEFAULT_BEHAVIOR,
    ...(LAYOUT_BEHAVIOR_OVERRIDES[layout] ?? {}),
  };
  const nextDefinition = widgetDefinitionDocSchema.parse({
    ...definition,
    content: {
      ...definition.content,
      maxItems: behavior.maxItems,
    },
    behavior: {
      ...definition.behavior,
      autoRotate: behavior.autoRotate,
      rotateInterval: behavior.rotateInterval,
    },
    branding: {
      ...definition.branding,
      watermark: behavior.showBranding,
    },
    wall:
      opts.kind === "wall" || layout === "wall"
        ? {
            ...wall,
            title: definition.wall?.title ?? wall.title,
            subhead: definition.wall?.subhead ?? wall.subhead,
          }
        : null,
  });

  return syncStudioConfig({
    name:
      opts.name ??
      (opts.kind === "wall"
        ? "Wall of Love"
        : labelForLayout(layout, "embed widget")),
    definition: nextDefinition,
  });
}

export function themeInputsToTokens(
  theme: WidgetBrandThemeInputs,
  preset = "parametric",
): WidgetDesignTokens {
  const concrete = theme.appearance === "dark" ? "dark" : "light";
  const derived = resolveBrandTheme(theme, concrete);
  return {
    preset,
    accent: derived.accent,
    text: derived.text,
    bg: derived.background,
    line: derived.border,
    surface: derived.surface,
    radius: derived.radius,
    fontFamily: derived.fontFamily,
    fontHead: derived.fontFamily,
    cardStyle: theme.surfaceStyle,
    density: theme.density,
  };
}

export function syncStudioConfig(
  input: Partial<WidgetStudioConfig> & { name?: string },
  opts: { fromMirrors?: boolean } = {},
): WidgetStudioConfig {
  const definition = opts.fromMirrors
    ? definitionFromMirrors(input)
    : widgetDefinitionDocSchema.parse(
        input.definition ?? projectFlatWidgetToV1(input),
      );
  const wall = definition.wall ?? input.wall ?? buildDefaultWallConfig("wall");
  return {
    name: input.name ?? "Untitled widget",
    definition,
    kind: definition.kind,
    layout: definition.layout.preset,
    theme: definition.theme.appearance,
    tokens: themeInputsToTokens(
      definition.theme,
      input.tokens?.preset ?? "parametric",
    ),
    visibility: { ...definition.display },
    behavior: {
      maxItems: definition.content.maxItems,
      autoRotate: definition.behavior.autoRotate,
      rotateInterval: definition.behavior.rotateInterval,
      showBranding: definition.branding.watermark,
    },
    content: {
      mode: definition.content.mode,
      pickedIds: [...definition.content.pickedIds],
    },
    wall,
  };
}

export function randomThemeInputs(
  current: WidgetBrandThemeInputs,
): WidgetBrandThemeInputs {
  const preset =
    PRESET_THEMES[Math.floor(Math.random() * PRESET_THEMES.length)]?.theme ??
    DEFAULT_THEME;
  return {
    ...preset,
    brandColor: current.brandColor,
  };
}

function definitionFromMirrors(
  input: Partial<WidgetStudioConfig>,
): WidgetDefinitionDoc {
  const base = widgetDefinitionDocSchema.parse(
    input.definition ?? projectFlatWidgetToV1(input),
  );
  const kind = input.kind ?? base.kind;
  const layout = input.layout ?? base.layout.preset;
  const wall = input.wall ?? base.wall ?? buildDefaultWallConfig("wall");
  const theme = input.tokens
    ? {
        ...base.theme,
        appearance: normalizeAppearance(input.theme ?? base.theme.appearance),
        brandColor: input.tokens.accent,
        radius: nearestRadiusScale(input.tokens.radius),
        density: normalizeDensity(input.tokens.density),
        surfaceStyle: normalizeSurfaceStyle(input.tokens.cardStyle),
      }
    : {
        ...base.theme,
        appearance: normalizeAppearance(input.theme ?? base.theme.appearance),
      };

  return widgetDefinitionDocSchema.parse({
    ...base,
    kind,
    // A preset switch resets the variant (variants are preset-specific); an
    // unchanged preset keeps the doc's variant through mirror-driven patches.
    layout: {
      preset: layout,
      variant: layout === base.layout.preset ? base.layout.variant : "classic",
    },
    content: {
      ...base.content,
      mode: input.content?.mode ?? base.content.mode,
      pickedIds: input.content?.pickedIds ?? base.content.pickedIds,
      maxItems: input.behavior?.maxItems ?? base.content.maxItems,
    },
    display: {
      ...base.display,
      ...(input.visibility ?? {}),
    },
    behavior: {
      ...base.behavior,
      autoRotate: input.behavior?.autoRotate ?? base.behavior.autoRotate,
      rotateInterval:
        input.behavior?.rotateInterval ?? base.behavior.rotateInterval,
    },
    theme,
    branding: {
      ...base.branding,
      watermark: input.behavior?.showBranding ?? base.branding.watermark,
    },
    wall:
      kind === "wall" || layout === "wall"
        ? {
            slug: wall.slug,
            title: wall.title,
            subhead: wall.subhead,
          }
        : null,
  });
}

function nearestRadiusScale(px: number): WidgetBrandThemeInputs["radius"] {
  if (px <= 3) return 0;
  if (px <= 9) return 1;
  if (px <= 15) return 2;
  if (px <= 22) return 3;
  return 4;
}

function normalizeAppearance(value: unknown): WidgetTheme {
  return value === "dark" || value === "system" || value === "auto"
    ? value === "auto"
      ? "system"
      : value
    : "light";
}

function normalizeDensity(value: unknown): WidgetDensity {
  if (value === "compact" || value === "spacious") return value;
  if (value === "default") return "cozy";
  return "cozy";
}

function normalizeSurfaceStyle(value: unknown): WidgetCardStyle {
  if (value === "flat" || value === "elevated") return value;
  if (value === "shadow") return "elevated";
  return "bordered";
}

function labelForLayout(layout: WidgetLayout, suffix: string): string {
  const map: Record<WidgetLayout, string> = {
    carousel: "Carousel",
    grid: "Grid",
    masonry: "Masonry",
    list: "List",
    wall: "Wall",
  };
  return `${map[layout]} ${suffix}`;
}
