/**
 * WallShell — the page a wall widget *is*, everywhere it is shown.
 *
 * A wall is not a fragment: it is a hosted page with a measure, a gutter, a
 * masthead and a rule, and none of that belongs to one Next route. It used to,
 * and the result was that the studio previewed something visitors never get —
 * the studio dropped the raw fragment into a bare full-bleed div, so it drew
 * `widgets-core`'s own centred masthead, ran the deck edge-to-edge at whatever
 * the device width was, and split it into five 230px columns. The live page
 * suppressed that masthead (`omitWallHead`), wrote its own left-aligned one,
 * and constrained the deck to a rail. Two designs for one artifact.
 *
 * Presentational and prop-driven so both callers can reach it: the public route
 * from its `PublicWallPayload`, the studio from its draft.
 */

import type { ReactNode } from "react";
import type { WidgetPublishedSnapshot } from "@workspace/widgets-core/schema";

export interface WallShellTone {
  background: string;
  text: string;
  mutedText: string;
  accent: string;
  border: string;
  fontFamily?: string;
}

export interface WallShellStats {
  /** Mean rating across rated entries, or null when nothing is rated. */
  average: number | null;
  ratedCount: number;
}

interface WallShellProps {
  tone: WallShellTone;
  /** Quiet eyebrow above the title — the project doing the asking. */
  eyebrow?: string | null;
  title: string;
  subhead?: string | null;
  stats?: WallShellStats;
  /** Fills the viewport on a real page; a preview frame owns its own height. */
  fillViewport?: boolean;
  children: ReactNode;
}

export function WallShell({
  tone,
  eyebrow,
  title,
  subhead,
  stats,
  fillViewport = true,
  children,
}: WallShellProps) {
  const showStats = Boolean(stats?.average && stats.ratedCount > 0);

  return (
    <div
      style={{
        background: tone.background,
        color: tone.text,
        fontFamily: tone.fontFamily,
      }}
      className={fillViewport ? "min-h-svh" : "min-h-full"}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <header className="max-w-3xl">
          {eyebrow ? (
            <p
              className="text-[0.8rem] font-medium"
              style={{ color: tone.mutedText }}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="mt-2 text-balance font-semibold tracking-tight"
            style={{ fontSize: "clamp(1.9rem, 5vw, 3.1rem)", lineHeight: 1.06 }}
          >
            {title}
          </h1>
          {subhead ? (
            <p
              className="mt-4 max-w-2xl text-pretty text-[1.02rem] leading-relaxed"
              style={{ color: tone.mutedText }}
            >
              {subhead}
            </p>
          ) : null}
          {showStats && stats ? (
            <p className="mt-5 flex items-center gap-2.5 text-[0.85rem]">
              <HeroStars average={stats.average ?? 0} accent={tone.accent} />
              <span style={{ color: tone.mutedText }}>
                <strong style={{ color: tone.text, fontWeight: 600 }}>
                  {stats.average}
                </strong>{" "}
                from {stats.ratedCount}{" "}
                {stats.ratedCount === 1 ? "customer" : "customers"}
              </span>
            </p>
          ) : null}
        </header>
        <hr
          aria-hidden
          className="my-10 border-0"
          style={{ height: 1, background: tone.border }}
        />
        {children}
      </div>
    </div>
  );
}

const LIGHT_FALLBACK: WallShellTone = {
  background: "#ffffff",
  text: "#0d0d0e",
  mutedText: "#5c5c60",
  accent: "#0d0d0e",
  border: "#e4e4e7",
};

/**
 * The page colours around the fragment, from the widget's published theme.
 *
 * `forceDark` is the studio's dock: a "system" widget follows the page it is
 * previewed on, so the shell has to follow the same switch or the preview
 * would be a light page wrapped around a dark wall.
 */
export function wallToneFromTheme(
  snapshot: WidgetPublishedSnapshot["derivedTheme"],
  forceDark?: boolean,
): WallShellTone {
  const dark = forceDark ?? snapshot.appearance === "dark";
  const scheme = dark
    ? (snapshot.schemes.dark ?? snapshot.schemes.light)
    : (snapshot.schemes.light ?? snapshot.schemes.dark);
  if (!scheme) return LIGHT_FALLBACK;
  return {
    background: scheme.background,
    text: scheme.text,
    mutedText: scheme.mutedText,
    accent: scheme.accent,
    border: scheme.border,
    fontFamily: scheme.fontFamily,
  };
}

function HeroStars({ average, accent }: { average: number; accent: string }) {
  const rounded = Math.round(average);
  return (
    <span
      aria-hidden
      style={{ color: accent, letterSpacing: "0.08em" }}
      className="text-[0.95rem] leading-none"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} style={{ opacity: index < rounded ? 1 : 0.25 }}>
          ★
        </span>
      ))}
    </span>
  );
}
