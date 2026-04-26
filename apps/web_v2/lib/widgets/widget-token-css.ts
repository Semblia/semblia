/**
 * Widget token → CSS variable bridge.
 *
 * Emits `--w-*` custom properties that the preview renderers consume.
 * Theme resolution (auto → resolved light/dark) happens here so renderers
 * stay simple.
 */

import type {
  WidgetDesignTokens,
  WidgetTheme,
  WidgetDensity,
  WidgetCardStyle,
} from "./widget-types";

// ── Hex / alpha helpers ─────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

function safeHex(hex: string, fallback = "#000000"): string {
  return HEX_RE.test(hex) ? hex : fallback;
}

export function hexAlpha(hex: string, alpha: number): string {
  if (!HEX_RE.test(hex)) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  // Normalize 3- or 4-char hex to 6.
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}${a}`;
  }
  return `${hex.slice(0, 7)}${a}`;
}

// ── Density scale ───────────────────────────────────────────────────────────

interface DensityValues {
  cardPadX: number;
  cardPadY: number;
  cardGap: number;
  fontBase: number;
  fontSm: number;
  fontXs: number;
  fontHead: number;
  avatarSize: number;
}

function densityValues(density: WidgetDensity): DensityValues {
  const p = { compact: 12, default: 18, cozy: 22 }[density];
  const g = { compact: 10, default: 14, cozy: 18 }[density];
  const fb = { compact: 13, default: 14, cozy: 15 }[density];
  return {
    cardPadX: p,
    cardPadY: p,
    cardGap: g,
    fontBase: fb,
    fontSm: fb - 2,
    fontXs: fb - 4,
    fontHead: fb + 12,
    avatarSize: { compact: 28, default: 32, cozy: 36 }[density],
  };
}

// ── Card style → shadow / border ────────────────────────────────────────────

function cardShadow(style: WidgetCardStyle, ink: string): string {
  switch (style) {
    case "shadow":
      return `0 2px 12px ${hexAlpha(safeHex(ink), 0.06)}`;
    case "elevated":
      return `0 8px 28px ${hexAlpha(safeHex(ink), 0.1)}, 0 1px 3px ${hexAlpha(safeHex(ink), 0.04)}`;
    case "bordered":
    case "flat":
      return "none";
  }
}

function cardBorder(style: WidgetCardStyle, line: string): string {
  if (style === "bordered") return `1px solid ${line}`;
  if (style === "flat") return "1px solid transparent";
  if (style === "shadow") return `1px solid ${hexAlpha(safeHex(line), 0.4)}`;
  return `1px solid ${hexAlpha(safeHex(line), 0.6)}`;
}

// ── Theme resolution (auto → resolved) ──────────────────────────────────────

function resolveTheme(
  theme: WidgetTheme,
  preferDark: boolean,
): "light" | "dark" {
  if (theme === "auto") return preferDark ? "dark" : "light";
  return theme;
}

// ── Token selection per resolved theme ──────────────────────────────────────

interface ResolvedTokens {
  accent: string;
  text: string;
  bg: string;
  surface: string;
  line: string;
}

/**
 * If user picked `light` or `dark` explicitly, we use the tokens as authored.
 * If `auto`, we synthesize a dark complement when prefers-color-scheme: dark.
 *
 * The synthesis is deliberately simple — full dark-mode color planning lives
 * in the presets; this fallback only fires when a non-dark preset is shown
 * in dark mode via `auto`.
 */
function resolveTokens(
  tokens: WidgetDesignTokens,
  resolved: "light" | "dark",
): ResolvedTokens {
  const isAuthoredDark = isDarkBg(tokens.bg);
  if (resolved === "dark" && !isAuthoredDark) {
    return {
      accent: tokens.accent,
      text: "#f5f5f5",
      bg: "#0e0e10",
      surface: "#161618",
      line: "#26262a",
    };
  }
  if (resolved === "light" && isAuthoredDark) {
    return {
      accent: tokens.accent,
      text: "#0f172a",
      bg: "#ffffff",
      surface: "#f7f7f8",
      line: "#e5e7eb",
    };
  }
  return {
    accent: tokens.accent,
    text: tokens.text,
    bg: tokens.bg,
    surface: tokens.surface,
    line: tokens.line,
  };
}

function isDarkBg(hex: string): boolean {
  if (!HEX_RE.test(hex)) return false;
  const h = hex.slice(1);
  const norm =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  // Perceived luminance.
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 96;
}

// ── Public: tokens → CSS variables ──────────────────────────────────────────

export interface TokenCssOptions {
  theme: WidgetTheme;
  /** When `theme === "auto"`, resolves to `dark` if true. */
  preferDark?: boolean;
}

export function widgetTokensToCss(
  tokens: WidgetDesignTokens,
  opts: TokenCssOptions,
): React.CSSProperties {
  const resolved = resolveTheme(opts.theme, opts.preferDark ?? false);
  const c = resolveTokens(tokens, resolved);
  const d = densityValues(tokens.density);
  const isDark = resolved === "dark";

  return {
    // Color
    "--w-accent": c.accent,
    "--w-accent-12": hexAlpha(c.accent, 0.12),
    "--w-accent-24": hexAlpha(c.accent, 0.24),
    "--w-text": c.text,
    "--w-text-soft": hexAlpha(c.text, 0.65),
    "--w-text-faint": hexAlpha(c.text, 0.4),
    "--w-bg": c.bg,
    "--w-surface": c.surface,
    "--w-surface-60": hexAlpha(c.surface, 0.6),
    "--w-line": c.line,
    "--w-line-50": hexAlpha(c.line, 0.5),
    // Type
    "--w-font": tokens.fontFamily,
    "--w-font-head": tokens.fontHead,
    "--w-fs-base": `${d.fontBase}px`,
    "--w-fs-sm": `${d.fontSm}px`,
    "--w-fs-xs": `${d.fontXs}px`,
    "--w-fs-head": `${d.fontHead}px`,
    // Shape
    "--w-radius": `${tokens.radius}px`,
    "--w-card-pad-x": `${d.cardPadX}px`,
    "--w-card-pad-y": `${d.cardPadY}px`,
    "--w-card-gap": `${d.cardGap}px`,
    "--w-card-shadow": cardShadow(tokens.cardStyle, c.text),
    "--w-card-border": cardBorder(tokens.cardStyle, c.line),
    // Avatar
    "--w-avatar": `${d.avatarSize}px`,
    // For `colorScheme` so native form controls invert in dark mode.
    ...(isDark ? { colorScheme: "dark" as const } : {}),
  } as React.CSSProperties;
}

// Re-export resolveTheme for the preview chrome (live indicator label).
export function getResolvedTheme(
  theme: WidgetTheme,
  preferDark = false,
): "light" | "dark" {
  return resolveTheme(theme, preferDark);
}
