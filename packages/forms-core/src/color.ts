/**
 * Color utilities for the theme engine.
 *
 * OKLab / OKLCH conversions follow Björn Ottosson
 * (https://bottosson.github.io/posts/oklab/). WCAG contrast uses the standard
 * sRGB relative-luminance formula. Everything operates on `#rrggbb` hex strings
 * at the boundary so the rest of the engine never juggles raw channels.
 */

export interface Oklch {
  /** Perceptual lightness, 0..1 */
  l: number;
  /** Chroma, 0..~0.4 */
  c: number;
  /** Hue, degrees 0..360 */
  h: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    // Malformed input → mid grey, so a bad brand color can never crash a render.
    return { r: 0.5, g: 0.5, b: 0.5 };
  }
  const n = Number.parseInt(h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const hx = (x: number) =>
    Math.round(clamp01(x) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

/** Sanitize arbitrary input into a clean `#rrggbb`. Valid colors round-trip exactly; malformed input falls back to mid grey. */
export function normalizeHex(hex: string): string {
  return rgbToHex(hexToRgb(hex));
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

export function oklchToRgb({ l: L, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: clamp01(linearToSrgb(lr)),
    g: clamp01(linearToSrgb(lg)),
    b: clamp01(linearToSrgb(lb)),
  };
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex));
}

export function oklchToHex(o: Oklch): string {
  return rgbToHex(oklchToRgb(o));
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** The more readable of near-black / white to sit on top of `bg`. */
export function onColor(bg: string): string {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#0b0b0c")
    ? "#ffffff"
    : "#0b0b0c";
}

/**
 * Walk the OKLCH lightness of `fg` until it meets `target` contrast against
 * `bg`. This is the accessibility clamp: the caller's color intent yields to
 * readability, never the other way around.
 */
export function ensureContrast(
  fgHex: string,
  bgHex: string,
  target: number,
  direction: "auto" | "darken" | "lighten" = "auto",
): string {
  if (contrastRatio(fgHex, bgHex) >= target) return fgHex;

  const fg = hexToOklch(fgHex);
  const dir =
    direction === "auto"
      ? relativeLuminance(bgHex) > 0.4
        ? "darken"
        : "lighten"
      : direction;

  const step = 0.02;
  let l = fg.l;
  for (let i = 0; i < 60; i++) {
    l = clamp01(l + (dir === "darken" ? -step : step));
    const candidate = oklchToHex({ l, c: fg.c, h: fg.h });
    if (contrastRatio(candidate, bgHex) >= target) return candidate;
    if (l <= 0 || l >= 1) break;
  }
  // Last resort: whichever pole maximises contrast.
  return relativeLuminance(bgHex) > 0.4 ? "#0b0b0c" : "#ffffff";
}
