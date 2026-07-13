"use client";

/**
 * WidgetThemeSwatch — a faithful miniature of a testimonial card, rendered from
 * the *real* derivation engine (`resolveBrandThemeSnapshot`). The same tokens the
 * production widget renderer uses (accent / surface / text / radius / button
 * style / type / spacing) drive this swatch, so a visual picker built from it can
 * never drift from what actually embeds. It is the visual referent that replaces
 * the widget studio's old appearance dropdowns + flat color-chip previews: each
 * option tile renders this with one knob changed.
 *
 * Widget analog of the forms `ThemeSwatch` (which renders a mini form). Sizing is
 * `em`-relative off a single `scale` (root font-size in px), so the same component
 * reads correctly as a tiny option tile or a larger preset card.
 */

import * as React from "react";
import {
  resolveBrandThemeSnapshot,
  type BrandThemeInputs,
  type DerivedTheme,
} from "@workspace/widgets-core/theme";
import { cn } from "@/lib/utils";

function pickScheme(inputs: BrandThemeInputs): DerivedTheme | null {
  try {
    const snap = resolveBrandThemeSnapshot(inputs);
    return inputs.appearance === "dark"
      ? (snap.schemes.dark ?? snap.schemes.light ?? null)
      : (snap.schemes.light ?? snap.schemes.dark ?? null);
  } catch {
    return null;
  }
}

export function WidgetThemeSwatch({
  inputs,
  scale = 11,
  className,
}: {
  inputs: BrandThemeInputs;
  /** Root font-size in px; everything inside scales from it. */
  scale?: number;
  className?: string;
}) {
  const t = React.useMemo(() => pickScheme(inputs), [inputs]);
  if (!t) {
    return <div className={cn("size-full bg-muted", className)} aria-hidden />;
  }

  // Engine values are absolute px tuned for a ~15px base; scale them down so the
  // miniature keeps the same proportions at any tile size.
  const k = scale / 15;
  const bw = Math.max(0.5, t.borderWidth * k);
  const radius = Math.max(2, t.radiusField * k);
  const elevated = t.shadow.trim() !== "";

  const chipStyle: React.CSSProperties =
    t.buttonStyle === "outline"
      ? {
          background: "transparent",
          color: t.accent,
          border: `${bw}px solid ${t.accent}`,
        }
      : t.buttonStyle === "soft"
        ? { background: t.accentSoft, color: t.accentSoftText }
        : { background: t.accent, color: t.accentText };

  return (
    <div
      className={cn("flex size-full items-center justify-center", className)}
      style={{ background: t.background, fontSize: scale }}
      aria-hidden
    >
      <div
        style={{
          width: "80%",
          background: t.surface,
          border: `${bw}px solid ${t.border}`,
          borderRadius: radius,
          padding: "1.05em",
          boxShadow: elevated
            ? "0 0.45em 1em -0.55em rgba(15,20,30,0.32)"
            : "none",
          fontFamily: t.fontFamily,
          color: t.text,
        }}
      >
        {/* star rating — the always-accent element */}
        <div
          style={{
            display: "flex",
            gap: "0.12em",
            marginBottom: "0.6em",
            color: t.accent,
            fontSize: "0.78em",
            lineHeight: 1,
          }}
        >
          {"★★★★★"}
        </div>

        {/* quote — real text so the type pairing shows */}
        <div
          style={{
            fontSize: "0.62em",
            lineHeight: 1.45,
            fontWeight: 500,
            marginBottom: "0.85em",
          }}
        >
          “Genuinely the best switch we&rsquo;ve made all year.”
        </div>

        {/* author row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1.7em",
              height: "1.7em",
              borderRadius: 999,
              background: t.accentSoft,
              color: t.accentSoftText,
              fontSize: "0.55em",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            MK
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                width: "3.6em",
                height: "0.42em",
                borderRadius: 999,
                background: t.text,
                opacity: 0.82,
                marginBottom: "0.34em",
              }}
            />
            <span
              style={{
                display: "block",
                width: "2.6em",
                height: "0.34em",
                borderRadius: 999,
                background: t.mutedText,
              }}
            />
          </span>
          {/* accent chip — doubles as the button-style referent */}
          <span
            style={{
              marginLeft: "auto",
              width: "1.9em",
              height: "0.95em",
              borderRadius: Math.max(2, t.radius * k * 0.6),
              flexShrink: 0,
              ...chipStyle,
            }}
          />
        </div>
      </div>
    </div>
  );
}
