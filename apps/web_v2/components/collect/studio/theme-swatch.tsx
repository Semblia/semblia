"use client";

/**
 * ThemeSwatch — a faithful miniature of the form, rendered from the *real*
 * derivation engine (`resolveThemeSnapshot`). The same tokens the production
 * renderer uses (accent / surface / text / radius / button style / spacing)
 * drive this swatch, so a visual picker built from it can never drift from what
 * actually ships. It is the visual referent that replaces the studio's old
 * appearance dropdowns: each option tile renders this with one knob changed.
 *
 * Sizing is `em`-relative off a single `scale` (root font-size in px), so the
 * same component reads correctly as a tiny option tile or a larger preset card.
 */

import * as React from "react";
import {
  resolveThemeSnapshot,
  type DerivedFormTheme,
  type FormThemeInputs,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";

function pickScheme(inputs: FormThemeInputs): DerivedFormTheme | null {
  try {
    const snap = resolveThemeSnapshot(inputs);
    return inputs.appearance === "dark"
      ? (snap.schemes.dark ?? snap.schemes.light ?? null)
      : (snap.schemes.light ?? snap.schemes.dark ?? null);
  } catch {
    return null;
  }
}

export function ThemeSwatch({
  inputs,
  scale = 9,
  className,
}: {
  inputs: FormThemeInputs;
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
  const radius = t.radius * k;
  const radiusField = t.radiusField * k;
  const border = `${Math.max(0.5, t.borderWidth * k)}px solid ${t.border}`;
  const elevated = t.shadow.trim() !== "";

  const buttonStyle: React.CSSProperties =
    t.buttonStyle === "outline"
      ? {
          background: "transparent",
          color: t.accent,
          border: `${Math.max(0.5, t.borderWidth * k)}px solid ${t.accent}`,
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
          width: "78%",
          background: t.surface,
          border,
          borderRadius: radius,
          padding: "1.15em",
          boxShadow: elevated
            ? "0 0.45em 1em -0.55em rgba(15,20,30,0.32)"
            : "none",
          fontFamily: t.fontFamily,
        }}
      >
        {/* brand line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4em",
            marginBottom: "0.7em",
          }}
        >
          <span
            style={{
              width: "0.7em",
              height: "0.7em",
              borderRadius: 999,
              background: t.accent,
            }}
          />
          <span
            style={{
              width: "3.4em",
              height: "0.42em",
              borderRadius: 999,
              background: t.text,
              opacity: 0.85,
            }}
          />
        </div>
        {/* title */}
        <div
          style={{
            width: "82%",
            height: "0.62em",
            borderRadius: 999,
            background: t.text,
            marginBottom: "0.9em",
          }}
        />
        {/* fields */}
        {[0.86, 0.7].map((w, i) => (
          <div
            key={i}
            style={{
              width: `${w * 100}%`,
              height: "1.5em",
              borderRadius: radiusField,
              background: t.surfaceRaised,
              border: `${Math.max(0.5, t.borderWidth * k)}px solid ${t.border}`,
              marginBottom: i === 0 ? `${0.5 * k + 0.35}em` : "0.9em",
            }}
          />
        ))}
        {/* submit */}
        <div
          style={{
            width: "3.6em",
            height: "1.5em",
            borderRadius: radiusField,
            ...buttonStyle,
          }}
        />
      </div>
    </div>
  );
}
