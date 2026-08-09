import Image from "next/image";

import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export type BrandLogoVariant = "default" | "inverted";
export type BrandLogoType = "vector" | "raster";

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Available PNG sizes for the default (dark) logo */
const DEFAULT_RASTER_SIZES = [64, 128, 256, 512, 768, 1024] as const;

/**
 * Available PNG sizes for the inverted (light) logo.
 * Note: the 64 px inverted asset has a typo in its filename (`inverteed`),
 * so we start at 128 for inverted raster.
 */
const INVERTED_RASTER_SIZES = [128, 256, 512, 768, 1024] as const;

/** Picks the smallest available raster size that is >= displaySize for crisp rendering. */
function pickRasterSize(sizes: readonly number[], displaySize: number): number {
  const candidates = sizes.filter((s) => s >= displaySize);
  return candidates.length > 0 ? candidates[0] : sizes[sizes.length - 1];
}

/**
 * Resolves the public-folder path to the correct logo asset.
 *
 * - Vector (SVG) assets are resolution-independent; we always serve the 512 px
 *   source so Next.js has a single, well-sized SVG to cache.
 * - Raster (PNG) assets pick the nearest size ≥ displaySize for sharp rendering.
 */
function resolveSrc(
  type: BrandLogoType,
  variant: BrandLogoVariant,
  displaySize: number,
): string {
  if (type === "vector") {
    return variant === "inverted"
      ? "/assets/brand/semblia-inverted-512.svg"
      : "/assets/brand/semblia512.svg";
  }

  if (variant === "inverted") {
    const s = pickRasterSize(INVERTED_RASTER_SIZES, displaySize);
    return `/assets/brand/semblia-inverted-${s}.png`;
  }

  const s = pickRasterSize(DEFAULT_RASTER_SIZES, displaySize);
  return `/assets/brand/semblia${s}.png`;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export type BrandLogoProps = {
  /**
   * Asset format.
   * - `"vector"` (default) — SVG, resolution-independent, ideal for icons and small sizes.
   * - `"raster"` — PNG, picks the nearest pre-generated size ≥ `size`.
   */
  type?: BrandLogoType;

  /**
   * Displayed width **and** height in pixels.
   * For vector assets this is the rendered size; the SVG source is always crisp.
   * For raster assets the closest available PNG ≥ this value is chosen automatically.
   * Defaults to `32`.
   */
  size?: number;

  /**
   * Which colour version to use.
   * - `"default"` — dark (black) marks; use on light or amber/brand-coloured backgrounds.
   * - `"inverted"` — light (white) marks; use on dark backgrounds.
   *
   * **Tip:** when the container background is `var(--foreground)` (which flips between
   * near-black in light mode and near-white in dark mode), pass `variant="default"` and
   * add `className="invert dark:invert-0"` so the logo adapts to both themes.
   */
  variant?: BrandLogoVariant;

  /**
   * Optional CSS colour value for a wrapper container.
   * When provided, the logo is placed inside a `flex`-centred `<span>` with this
   * background colour. The transparent logo background is preserved.
   *
   * @example background="var(--foreground)"
   * @example background="oklch(0.7 0.12 55)"
   */
  background?: string;

  /**
   * Extra Tailwind classes applied to the container `<span>`.
   * Only used when `background` is set.
   */
  containerClassName?: string;

  /** Extra Tailwind classes applied to the `<Image>` element. */
  className?: string;

  /**
   * Accessible alt text.
   * Pass `alt=""` for purely decorative usages (e.g. when adjacent text already
   * conveys the brand name).
   * Defaults to `"Semblia"`.
   */
  alt?: string;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Renders the Semblia brand logo using Next.js `<Image>` for automatic
 * optimisation (lazy-load, responsive srcset, format negotiation for raster).
 * SVG assets are served unoptimised — they are already resolution-independent.
 *
 * @example
 * // Small icon on a dark container:
 * <BrandLogo size={16} variant="inverted" />
 *
 * @example
 * // Icon with its own background wrapper:
 * <BrandLogo size={16} variant="default" background="var(--brand)" containerClassName="rounded-lg size-8" />
 *
 * @example
 * // Theme-adaptive icon (bg-foreground flips light ↔ dark):
 * <BrandLogo size={16} variant="default" className="invert dark:invert-0" />
 */
export function BrandLogo({
  type = "vector",
  size = 32,
  variant = "default",
  background,
  containerClassName,
  className,
  alt = "Semblia",
}: BrandLogoProps) {
  const src = resolveSrc(type, variant, size);
  const isVector = type === "vector";

  const image = (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      // SVG assets must opt out of Next.js image optimisation pipeline
      unoptimized={isVector}
      draggable={false}
    />
  );

  if (!background) return image;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        containerClassName,
      )}
      style={{ backgroundColor: background }}
    >
      {image}
    </span>
  );
}
