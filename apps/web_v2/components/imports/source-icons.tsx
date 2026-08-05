"use client";

/**
 * A recognizable mark for every import source.
 *
 * The import catalog is 56 sources. Picking one from a list of plain text
 * labels means reading 56 words; picking one from a grid of marks means
 * recognizing a logo, which is how people actually choose a platform. Phosphor
 * ships accurate marks for the mainstream platforms, so those are used
 * directly. The rest — the testimonial tools, the niche review sites — have no
 * mark available, and inventing one would be worse than not having it, so they
 * fall back to their own initials set in the same chip. Every tile is the same
 * size and weight either way, which is what keeps the grid scannable.
 *
 * Deliberately monochrome (`currentColor`): the grid is a set of choices, not a
 * sponsor wall, and full-colour logos at tile size read as noise next to the
 * app's own restraint.
 */

import * as React from "react";
import {
  AmazonLogoIcon,
  AppStoreLogoIcon,
  ApplePodcastsLogoIcon,
  DiscordLogoIcon,
  FacebookLogoIcon,
  FileXlsIcon,
  GlobeIcon,
  GoodreadsLogoIcon,
  GoogleChromeLogoIcon,
  GoogleLogoIcon,
  GooglePlayLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  PencilSimpleLineIcon,
  PinterestLogoIcon,
  RedditLogoIcon,
  SlackLogoIcon,
  TelegramLogoIcon,
  ThreadsLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Catalog key → mark. Null-prototype so a key that collides with an Object
 * member ("constructor", "toString") falls through to the monogram instead of
 * resolving to a non-component off the prototype chain.
 */
const SOURCE_ICONS: Record<string, PhosphorIcon> = Object.assign(
  Object.create(null) as Record<string, PhosphorIcon>,
  {
    // Methods, not platforms — these two describe how the proof arrives.
    spreadsheet: FileXlsIcon,
    manual: PencilSimpleLineIcon,
    "web-page": GlobeIcon,

    x: XLogoIcon,
    linkedin: LinkedinLogoIcon,
    "google-business": GoogleLogoIcon,
    youtube: YoutubeLogoIcon,
    "google-play": GooglePlayLogoIcon,
    "apple-app-store": AppStoreLogoIcon,
    "apple-podcasts": ApplePodcastsLogoIcon,
    "chrome-web-store": GoogleChromeLogoIcon,
    goodreads: GoodreadsLogoIcon,
    reddit: RedditLogoIcon,
    facebook: FacebookLogoIcon,
    instagram: InstagramLogoIcon,
    pinterest: PinterestLogoIcon,
    tiktok: TiktokLogoIcon,
    threads: ThreadsLogoIcon,
    slack: SlackLogoIcon,
    discord: DiscordLogoIcon,
    telegram: TelegramLogoIcon,
    whatsapp: WhatsappLogoIcon,
    amazon: AmazonLogoIcon,
  },
);

/**
 * Initials for a source with no available mark.
 *
 * Always two characters where the name allows it. One initial collides
 * constantly in this catalog — Senja, Shoutout and Shapo are all "S" — and a
 * grid of identical letters is worse than no mark at all. Two keeps them
 * distinct: "Se", "Sh", "Sha" → "Sh"… so single words fall back to a first-two
 * that at least differs more often, and multi-word names use one letter per
 * word. A name that is already short ("G2") is its own mark.
 *
 * Splits on whitespace only: "Walls.io" and "Testimonial.to" are one word each
 * and reading their suffix as a second word gave "WI" and "TT".
 */
export function sourceMonogram(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const [word] = words;
    if (word.length <= 2) return word.toUpperCase();
    return word[0].toUpperCase() + word[1].toLowerCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export interface SourceMarkProps {
  sourceKey: string;
  label: string;
  /** Tile chrome size. `"sm"` for inline chips, `"md"` for picker tiles. */
  size?: "sm" | "md";
  /** Dim the mark for a source that can't be used right now. */
  muted?: boolean;
  className?: string;
}

/**
 * One source's mark in the app's standard bordered chip — the same chip the
 * integrations picker and the import landing's method rows already use, so a
 * source tile reads as native beside them.
 */
export function SourceMark({
  sourceKey,
  label,
  size = "md",
  muted = false,
  className,
}: SourceMarkProps) {
  const Icon = SOURCE_ICONS[sourceKey];

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface text-foreground",
        size === "sm" ? "size-7" : "size-9",
        muted && "opacity-55 grayscale",
        className,
      )}
    >
      {Icon ? (
        <Icon className={size === "sm" ? "size-3.5" : "size-4.5"} />
      ) : (
        <span
          className={cn(
            "font-medium tracking-tight text-muted-foreground",
            size === "sm" ? "text-[10px]" : "text-[11px]",
          )}
        >
          {sourceMonogram(label)}
        </span>
      )}
    </span>
  );
}
