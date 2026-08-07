"use client";

/**
 * A recognizable, colour-carrying mark for every import source.
 *
 * The import catalog is 56 sources. Picking one from a list of plain text
 * labels means reading 56 words; picking one from a grid of marks means
 * recognizing a platform, which is how people actually choose one.
 *
 * Two things do that work, and colour does most of it. Phosphor ships accurate
 * marks for the mainstream platforms, so those are used directly — in the
 * platform's own colour, because a monochrome grid of eighteen outlines is a
 * puzzle and a coloured one is a glance. The rest — the testimonial tools, the
 * niche review sites — have no mark anywhere, and inventing a logo would be
 * worse than not having one, so they keep their initials but get a stable
 * colour of their own. That is what makes "Shoutout" and "Shapo" (both "Sh")
 * tell each other apart at tile size.
 *
 * Every mark is one chip: the colour as the glyph, a 10% wash of the same
 * colour as the field, and a hairline ring of it. One container level, no
 * sponsor-wall saturation.
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
    // Methods, not platforms — these three describe how the proof arrives.
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
 * A brand whose mark is black (X, TikTok, Threads) has no usable fixed colour:
 * black vanishes on the dark theme and `#fff` vanishes on the light one. Those
 * take the theme's own ink instead, which is the same intent in both.
 */
const INK = "var(--foreground)";

/**
 * Ten mid-tone hues, chosen to stay legible on both the light linen and the
 * dark graphite surface — a brand colour that only works in one theme is worse
 * than no colour. Used verbatim where the platform's colour is well known, and
 * assigned by hand below where it is not.
 */
const HUE = {
  red: "#DE5147",
  orange: "#DD7B2E",
  amber: "#C08A1E",
  green: "#3E9C63",
  teal: "#2F9E9E",
  sky: "#2E90CE",
  blue: "#3B7DD8",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  magenta: "#C0559B",
} as const;

/**
 * Catalog key → colour.
 *
 * Where the platform's own colour is common knowledge it is used exactly
 * (LinkedIn blue, YouTube red, WhatsApp green). Where it is not — the
 * testimonial tools especially — no colour is invented as if it were official;
 * a hue from the table above is assigned so that neighbours in the grid never
 * repeat, and it stays the same colour on every screen it appears on.
 */
const SOURCE_COLORS: Record<string, string> = Object.assign(
  Object.create(null) as Record<string, string>,
  {
    // Methods
    spreadsheet: HUE.green,
    manual: HUE.amber,
    "web-page": HUE.sky,

    // Connected social — the platform's own colour.
    x: INK,
    linkedin: "#0A66C2",
    "google-business": "#4285F4",
    youtube: "#FF0033",
    "google-play": "#00A173",

    // Stores, apps, media
    "apple-app-store": "#0D96F6",
    "apple-podcasts": "#9933CC",
    "chrome-web-store": "#4285F4",
    goodreads: "#8C6A4A",
    reddit: "#FF4500",
    facebook: "#1877F2",
    instagram: "#E4405F",
    pinterest: "#E60023",
    tiktok: INK,
    threads: INK,
    slack: "#8E5FA8",
    discord: "#5865F2",
    telegram: "#26A5E4",
    whatsapp: "#25D366",
    amazon: "#FF9900",
    airbnb: "#FF5A5F",
    twitch: "#9146FF",
    vimeo: "#1AB7EA",
    shopify: "#5E9E45",
    spotify: "#1DB954",

    // Review and marketplace sites
    trustpilot: "#00B67A",
    g2: "#FF492C",
    capterra: HUE.orange,
    yelp: "#D32323",
    "product-hunt": "#DA552F",
    appsumo: HUE.amber,
    fiverr: "#1DBF73",
    udemy: "#A435F0",
    skillshare: "#00FF84",
    sourceforge: HUE.orange,
    wordpress: HUE.sky,
    whop: HUE.indigo,
    zillow: "#006AFF",
    realtor: "#D92228",
    homestars: HUE.teal,
    trust: HUE.teal,

    // Wall migrations — assigned, not claimed. Adjacent tiles never repeat.
    "testimonial-to": HUE.indigo,
    senja: HUE.violet,
    famewall: HUE.magenta,
    endorsal: HUE.blue,
    trustmary: HUE.teal,
    shoutout: HUE.orange,
    feedspace: HUE.green,
    boast: HUE.sky,
    "vocal-video": HUE.red,
    wiserreview: HUE.amber,
    shapo: HUE.magenta,
    "walls-io": HUE.blue,
    taggbox: HUE.violet,
    embedsocial: HUE.red,
  },
);

/** Every source gets a colour; an unknown key lands on a stable one. */
const FALLBACK_HUES = Object.values(HUE);

export function sourceColor(sourceKey: string): string {
  const known = SOURCE_COLORS[sourceKey];
  if (known) return known;
  // A key the catalog grew after this table was written still gets a colour,
  // and the same one every time — a colourless tile in a coloured grid reads
  // as broken rather than as unknown.
  let hash = 0;
  for (let i = 0; i < sourceKey.length; i += 1) {
    hash = (hash * 31 + sourceKey.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_HUES[hash % FALLBACK_HUES.length];
}

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
  /** Chip size. `"sm"` for inline chips, `"md"` for picker tiles. */
  size?: "sm" | "md" | "lg";
  /** Dim the mark for a source that can't be used right now. */
  muted?: boolean;
  className?: string;
}

const CHIP_SIZE = {
  sm: "size-7 rounded-lg",
  md: "size-9 rounded-lg",
  lg: "size-11 rounded-xl",
} as const;

const GLYPH_SIZE = {
  sm: "size-3.5",
  md: "size-[1.15rem]",
  lg: "size-6",
} as const;

const MONOGRAM_SIZE = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-[13px]",
} as const;

/**
 * One source's mark. The chip takes its colour from the source and paints its
 * own field from that same colour, so the grid reads as a set of platforms
 * rather than a set of grey squares.
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
      // `color` drives all three layers: glyph, 10% field, 15% ring. Setting it
      // once here is what lets the Tailwind `current` utilities below stay
      // static classes rather than 56 generated colour variants.
      style={{ color: sourceColor(sourceKey) }}
      className={cn(
        "flex shrink-0 items-center justify-center bg-current/10 ring-1 ring-current/15",
        CHIP_SIZE[size],
        // Dimmed, not desaturated. Greying out the mark of a source that only
        // needs setup takes away the one thing that made the grid scannable,
        // and it is still the platform it always was.
        muted && "opacity-55",
        className,
      )}
    >
      {Icon ? (
        <Icon className={GLYPH_SIZE[size]} weight="fill" />
      ) : (
        <span
          className={cn(
            "font-semibold tracking-tight text-current",
            MONOGRAM_SIZE[size],
          )}
        >
          {sourceMonogram(label)}
        </span>
      )}
    </span>
  );
}
