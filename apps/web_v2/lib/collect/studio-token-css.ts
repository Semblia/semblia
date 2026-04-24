import type { DesignTokens } from "./studio-types";

/* ─── Hex alpha helper ────────────────────────────────────────────────────── */

export function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/* ─── Texture data-URI ────────────────────────────────────────────────────── */

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeHex(hex: string, fallback = "#000000"): string {
  return HEX_RE.test(hex) ? hex : fallback;
}

export function textureBg(
  texture: DesignTokens["texture"],
  ink: string,
): string {
  if (texture === "none") return "none";
  if (texture === "grain") {
    return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E")`;
  }
  const enc = encodeURIComponent(safeHex(ink));
  if (texture === "dots") {
    return `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.6' fill='${enc}' opacity='0.06'/%3E%3C/svg%3E")`;
  }
  return `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6L6 0' stroke='${enc}' stroke-width='0.3' opacity='0.06'/%3E%3C/svg%3E")`;
}

/* ─── Density scale (single source of truth for all spacing) ──────────────── */

interface DensityValues {
  fieldPad: number;
  fieldGap: number;
  labelGap: number;
  containerPadX: number;
  containerPadY: number;
  sectionGap: number;
  flowGap: number;
  btnPadY: number;
  btnPadX: number;
}

function densityValues(t: DesignTokens): DensityValues {
  const p = { compact: 8, default: 11, cozy: 14, airy: 18 }[t.density] ?? 11;
  const g = { compact: 16, default: 20, cozy: 22, airy: 28 }[t.density] ?? 20;
  return {
    fieldPad: p,
    fieldGap: g,
    labelGap: { compact: 4, default: 6, cozy: 8, airy: 10 }[t.density] ?? 6,
    containerPadX:
      { compact: 20, default: 36, cozy: 42, airy: 48 }[t.density] ?? 36,
    containerPadY:
      { compact: 24, default: 40, cozy: 48, airy: 56 }[t.density] ?? 40,
    sectionGap: Math.round(g * 1.4),
    flowGap: Math.round(g * 1.2),
    btnPadY: p,
    btnPadX: Math.round(p * 2.5),
  };
}

/* ─── Derived values ──────────────────────────────────────────────────────── */

function fieldRadius(t: DesignTokens): string {
  if (t.fieldShape === "pill") return "999px";
  if (t.fieldShape === "square") return "0px";
  return `${t.radius}px`;
}

function containerShadow(t: DesignTokens): string {
  switch (t.shadow) {
    case "sm":
      return `0 2px 8px ${hexAlpha(t.ink, 0.08)}`;
    case "soft":
      return `0 8px 32px ${hexAlpha(t.ink, 0.06)}`;
    case "hard":
      return `5px 5px 0 ${t.ink}`;
    case "glow":
      return `0 0 40px ${hexAlpha(t.accent, 0.15)}`;
    default:
      return "none";
  }
}

function btnShadow(t: DesignTokens): string {
  switch (t.shadow) {
    case "hard":
      return `3px 3px 0 ${t.ink}`;
    case "soft":
      return `0 4px 14px ${hexAlpha(t.accent, 0.3)}`;
    case "glow":
      return `0 0 20px ${hexAlpha(t.accent, 0.4)}`;
    default:
      return "none";
  }
}

function btnRadius(t: DesignTokens): string {
  if (t.buttonStyle === "pill") return "999px";
  if (t.buttonStyle === "block") return "0px";
  return `${t.radius}px`;
}

/* ─── Main export ─────────────────────────────────────────────────────────── */

export function tokensToCssVars(t: DesignTokens): React.CSSProperties {
  const d = densityValues(t);
  return {
    "--f-bg": t.bg,
    "--f-surface": t.surface,
    "--f-ink": t.ink,
    "--f-ink-soft": t.inkSoft,
    "--f-line": t.line,
    "--f-accent": t.accent,
    "--f-accent-ink": t.accentInk,
    "--f-surface-60": hexAlpha(t.surface, 0.6),
    "--f-line-50": hexAlpha(t.line, 0.5),
    "--f-line-30": hexAlpha(t.line, 0.3),
    "--f-ink-soft-50": hexAlpha(t.inkSoft, 0.5),
    "--f-ink-soft-30": hexAlpha(t.inkSoft, 0.3),
    "--f-accent-08": hexAlpha(t.accent, 0.08),
    "--f-accent-ink-80": hexAlpha(t.accentInk, 0.8),
    "--f-font-head": t.fontHead,
    "--f-font-body": t.fontBody,
    "--f-font-mono": t.fontMono || "ui-monospace, monospace",
    "--f-size-base": `${t.sizeBase}px`,
    "--f-size-head": `${t.sizeHead}px`,
    "--f-size-sm": `${t.sizeBase * 0.85}px`,
    "--f-size-xs": `${t.sizeBase * 0.7}px`,
    "--f-weight-head": t.weightHead,
    "--f-weight-body": t.weightBody,
    "--f-tracking-head": `${t.trackingHead}em`,
    "--f-radius": `${t.radius}px`,
    "--f-field-radius": fieldRadius(t),
    "--f-btn-radius": btnRadius(t),
    "--f-field-pad": `${d.fieldPad}px`,
    "--f-gap": `${d.fieldGap}px`,
    "--f-label-gap": `${d.labelGap}px`,
    "--f-container-pad-x": `${d.containerPadX}px`,
    "--f-container-pad-y": `${d.containerPadY}px`,
    "--f-container-max-w": "560px",
    "--f-hero-side-w": "42%",
    "--f-section-gap": `${d.sectionGap}px`,
    "--f-flow-gap": `${d.flowGap}px`,
    "--f-btn-pad-x": `${d.btnPadX}px`,
    "--f-btn-pad-y": `${d.btnPadY}px`,
    "--f-error-color": "#ef4444",
    "--f-sticky-bg": "var(--f-bg)",
    "--f-shadow": containerShadow(t),
    "--f-btn-shadow": btnShadow(t),
    "--f-texture": textureBg(t.texture, t.ink),
    "--f-is-underline": t.fieldShape === "underline" ? "1" : "0",
    "--f-btn-uppercase": t.buttonStyle === "block" ? "uppercase" : "none",
    "--f-btn-tracking": t.buttonStyle === "block" ? "0.08em" : "normal",
    "--f-btn-bg": t.buttonStyle === "ghost" ? "transparent" : t.accent,
    "--f-btn-color": t.buttonStyle === "ghost" ? t.accent : t.accentInk,
    "--f-btn-border-w": t.buttonStyle === "ghost" ? "1.5px" : "0",
    "--f-btn-border-s": t.buttonStyle === "ghost" ? "solid" : "none",
    "--f-btn-border-c":
      t.buttonStyle === "ghost" ? t.accent : "transparent",
    "--f-btn-width": t.buttonStyle === "block" ? "100%" : "auto",
    ...(t.dark ? { colorScheme: "dark" as const } : {}),
  } as React.CSSProperties;
}