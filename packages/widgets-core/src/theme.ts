export {
  applyThemeTuning,
  derivedThemeToCssVars,
  resolveBrandTheme,
  resolveBrandThemeSnapshot,
} from "@workspace/brand-theme";
export type {
  AccentIntensity,
  Appearance,
  BrandThemeInputs,
  ButtonStyle,
  Density,
  DerivedTheme,
  NeutralTone,
  RadiusScale,
  ResolvedBrandThemeSnapshot,
  SurfaceStyle,
  ThemeTuning,
  TypePairingId,
} from "@workspace/brand-theme";

import type {
  DerivedTheme,
  ResolvedBrandThemeSnapshot,
} from "@workspace/brand-theme";

export function derivedWidgetThemeToCssVars(
  t: DerivedTheme,
): Record<string, string> {
  return {
    "--semblia-widget-accent": t.accent,
    "--semblia-widget-accent-text": t.accentText,
    "--semblia-widget-accent-hover": t.accentHover,
    "--semblia-widget-accent-active": t.accentActive,
    "--semblia-widget-accent-soft": t.accentSoft,
    "--semblia-widget-accent-soft-text": t.accentSoftText,
    "--semblia-widget-focus-ring": t.focusRing,
    "--semblia-widget-bg": t.background,
    "--semblia-widget-surface": t.surface,
    "--semblia-widget-surface-raised": t.surfaceRaised,
    "--semblia-widget-text": t.text,
    "--semblia-widget-text-muted": t.mutedText,
    "--semblia-widget-border": t.border,
    "--semblia-widget-border-strong": t.borderStrong,
    "--semblia-widget-radius": `${t.radius}px`,
    "--semblia-widget-radius-card": `${t.radiusField}px`,
    "--semblia-widget-border-width": `${t.borderWidth}px`,
    "--semblia-widget-shadow": t.shadow,
    "--semblia-widget-space": `${t.spaceUnit}px`,
    "--semblia-widget-gap": `${t.fieldGap}px`,
    "--semblia-widget-section-gap": `${t.sectionGap}px`,
    "--semblia-widget-font": t.fontFamily,
  };
}

function varsToBlock(theme: DerivedTheme): string {
  return Object.entries(derivedWidgetThemeToCssVars(theme))
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

export function widgetThemeVarsCss(
  snapshot: ResolvedBrandThemeSnapshot,
): string {
  const { light, dark } = snapshot.schemes;
  if (snapshot.appearance === "dark" && dark) {
    return `.sw-scope{color-scheme:dark;${varsToBlock(dark)}}`;
  }
  if (snapshot.appearance === "light" && light) {
    return `.sw-scope{color-scheme:light;${varsToBlock(light)}}`;
  }
  const base = light ?? dark;
  let css = base ? `.sw-scope{color-scheme:light dark;${varsToBlock(base)}}` : "";
  if (light && dark) {
    css += `@media (prefers-color-scheme:dark){.sw-scope{${varsToBlock(dark)}}}`;
  }
  return css;
}
