import {
  defaultWidgetDefinition,
  normalizeWidgetAccents,
  projectFlatWidgetToV2,
  resolveWidgetTemplateManifest,
  widgetDefinitionDocSchema,
  WIDGET_TEMPLATES,
  type WidgetDefinitionDoc,
  type WidgetTemplateManifest,
} from "@workspace/widgets-core/schema";
import {
  resolveBrandTheme,
  type BrandThemeInputs,
} from "@workspace/widgets-core/theme";
import type {
  WallConfig,
  WidgetBehavior,
  WidgetContentConfig,
  WidgetDesignTokens,
  WidgetKind,
  WidgetLayout,
  WidgetStudioConfig,
  WidgetTemplateId,
  WidgetTheme,
  WidgetVisibility,
} from "./widget-types";

/**
 * Template-first widget model (template system rebuild 2026-07-13). The
 * definition doc is the source of truth; every studio mirror (layout/theme/
 * tokens) derives from it through the template manifest's recipe. The old
 * 8-preset knob-combination gallery is gone — the template roster IS the
 * starting-style choice, and brand facts are the only color input.
 */

export { WIDGET_TEMPLATES };
export type { WidgetTemplateManifest };

/** DB/list mirror: each template's nearest classic layout shape. */
export const TEMPLATE_TO_LAYOUT: Record<string, WidgetLayout> = {
  marquee: "carousel",
  gallery: "grid",
  mosaic: "masonry",
  column: "list",
  editorial: "wall",
};

export const DEFAULT_BRAND_COLOR = "#4338ca";

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

const TEMPLATE_BEHAVIOR_OVERRIDES: Partial<
  Record<string, Partial<WidgetBehavior>>
> = {
  marquee: { autoRotate: true, maxItems: 6 },
  gallery: { autoRotate: false, maxItems: 6 },
  mosaic: { autoRotate: false, maxItems: 9 },
  column: { autoRotate: false, maxItems: 5 },
  editorial: { autoRotate: false, maxItems: 12 },
};

const TEMPLATE_DEFAULT_FOR_KIND: Record<WidgetKind, WidgetTemplateId> = {
  embed: "marquee",
  wall: "editorial",
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
  templateId?: WidgetTemplateId;
  projectSlug: string;
  projectBrandColor?: string | null;
  name?: string;
}): WidgetStudioConfig {
  const templateId = opts.templateId ?? TEMPLATE_DEFAULT_FOR_KIND[opts.kind];
  const wall = buildDefaultWallConfig(opts.projectSlug);
  const definition = defaultWidgetDefinition({
    kind: opts.kind,
    templateId,
    brandColor: opts.projectBrandColor ?? DEFAULT_BRAND_COLOR,
    wallSlug: wall.slug,
  });
  const behavior = {
    ...DEFAULT_BEHAVIOR,
    ...(TEMPLATE_BEHAVIOR_OVERRIDES[templateId] ?? {}),
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
      opts.kind === "wall"
        ? {
            ...wall,
            title: definition.wall?.title ?? wall.title,
            subhead: definition.wall?.subhead ?? wall.subhead,
          }
        : null,
  });

  const manifest = resolveWidgetTemplateManifest(templateId);
  return syncStudioConfig({
    name:
      opts.name ??
      (opts.kind === "wall" ? "Wall of Love" : `${manifest.name} widget`),
    definition: nextDefinition,
  });
}

/** The template's resolved brand-theme inputs for a definition. */
export function definitionThemeInputs(
  definition: WidgetDefinitionDoc,
): BrandThemeInputs {
  const manifest = resolveWidgetTemplateManifest(definition.templateId);
  return manifest.themeInputs(
    definition.brand.color,
    definition.brand.appearance,
    normalizeWidgetAccents(manifest, definition.accents),
  );
}

export function themeInputsToTokens(
  theme: BrandThemeInputs,
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
        input.definition ?? projectFlatWidgetToV2(input),
      );
  const wall = definition.wall ?? input.wall ?? buildDefaultWallConfig("wall");
  return {
    name: input.name ?? "Untitled widget",
    definition,
    kind: definition.kind,
    templateId: definition.templateId,
    layout: TEMPLATE_TO_LAYOUT[definition.templateId] ?? "carousel",
    theme: definition.brand.appearance,
    tokens: themeInputsToTokens(
      definitionThemeInputs(definition),
      definition.templateId,
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

/**
 * Mirror-driven patch → definition. Template/brand edits write the definition
 * directly in the store; this path carries content/display/behavior/wall
 * mirrors plus the appearance toggle.
 */
function definitionFromMirrors(
  input: Partial<WidgetStudioConfig>,
): WidgetDefinitionDoc {
  const base = widgetDefinitionDocSchema.parse(
    input.definition ?? projectFlatWidgetToV2(input),
  );
  const kind = input.kind ?? base.kind;
  const templateId = input.templateId ?? base.templateId;
  const wall = input.wall ?? base.wall ?? buildDefaultWallConfig("wall");

  return widgetDefinitionDocSchema.parse({
    ...base,
    kind,
    templateId,
    // A template switch resets accents (they are template-scoped decisions).
    accents: templateId === base.templateId ? base.accents : {},
    brand: {
      ...base.brand,
      appearance: normalizeAppearance(input.theme ?? base.brand.appearance),
      ...(input.tokens ? { color: input.tokens.accent } : {}),
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
    branding: {
      ...base.branding,
      watermark: input.behavior?.showBranding ?? base.branding.watermark,
    },
    wall:
      kind === "wall"
        ? {
            slug: wall.slug,
            title: wall.title,
            subhead: wall.subhead,
          }
        : null,
  });
}

function normalizeAppearance(value: unknown): WidgetTheme {
  return value === "dark" || value === "system" || value === "auto"
    ? value === "auto"
      ? "system"
      : value
    : "light";
}
