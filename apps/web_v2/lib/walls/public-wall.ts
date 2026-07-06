/**
 * Public wall data layer — server-side only.
 *
 * Fetches `GET /v2/walls/:wallSlug` (public, Redis-cached API) and adapts it
 * for the hosted wall page: typed payload, render items for the shared
 * widgets-core SSR renderer, rating stats for the hero + JSON-LD, and the
 * published theme scheme that colours the page shell around the fragment.
 */

import type {
  PublishedWidgetDoc,
  WidgetDefinitionDoc,
  WidgetPublishedSnapshot,
} from "@workspace/widgets-core/schema";
import type { WidgetRenderItem } from "@workspace/widgets-core/render";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";

export interface PublicWallTestimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  authorAvatar: { url: string } | null;
  content: string;
  rating: number | null;
  source: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface PublicWallPayload {
  widget: {
    id: string;
    name: string;
    wall: { slug: string; title: string; subhead: string } | null;
    definition: WidgetDefinitionDoc;
    publishedSnapshot: WidgetPublishedSnapshot;
    behavior: { showBranding: boolean };
  };
  project: { name: string; websiteUrl: string | null } | null;
  testimonials: PublicWallTestimonial[];
}

/** Returns null on 404 (unknown/paused wall) so the page can `notFound()`. */
export async function fetchPublicWall(
  wallSlug: string,
): Promise<PublicWallPayload | null> {
  if (
    !process.env.NEXT_PUBLIC_API_URL &&
    process.env.NODE_ENV === "production"
  ) {
    // Surface the misconfiguration instead of silently fetching localhost.
    throw new Error("NEXT_PUBLIC_API_URL must be set to serve public walls");
  }
  const res = await fetch(
    `${API_BASE}/v2/walls/${encodeURIComponent(wallSlug)}`,
    // Timeout so a stalled api_v2 fails this SEO page fast (error boundary)
    // instead of hanging the render and generateMetadata indefinitely.
    { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wall fetch failed (${res.status})`);
  const body = (await res.json()) as
    | PublicWallPayload
    | { data: PublicWallPayload };
  return "data" in body ? body.data : body;
}

export function toRenderItems(
  testimonials: PublicWallTestimonial[],
): WidgetRenderItem[] {
  return testimonials.map((t) => ({
    id: t.id,
    authorName: t.authorName,
    authorRole: t.authorRole,
    authorCompany: t.authorCompany,
    authorAvatarUrl: t.authorAvatar?.url ?? null,
    content: t.content,
    rating: t.rating,
    source: t.source,
    sourceUrl: t.sourceUrl,
    createdAt: t.createdAt,
  }));
}

export function composeWallDoc(payload: PublicWallPayload): PublishedWidgetDoc {
  return {
    ...payload.widget.definition,
    derived: payload.widget.publishedSnapshot,
  };
}

export interface WallRatingStats {
  count: number;
  ratedCount: number;
  average: number | null;
}

export function wallRatingStats(
  testimonials: PublicWallTestimonial[],
): WallRatingStats {
  const rated = testimonials.filter(
    (t): t is PublicWallTestimonial & { rating: number } =>
      typeof t.rating === "number" && t.rating > 0,
  );
  const average = rated.length
    ? Math.round(
        (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length) * 10,
      ) / 10
    : null;
  return { count: testimonials.length, ratedCount: rated.length, average };
}

export interface WallShellTheme {
  background: string;
  text: string;
  mutedText: string;
  accent: string;
  border: string;
  dark: boolean;
  fontFamily: string;
}

const LIGHT_FALLBACK: WallShellTheme = {
  background: "#faf9f7",
  text: "#17181c",
  mutedText: "#6b7078",
  accent: "#4f46e5",
  border: "#e5e3df",
  dark: false,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

/**
 * The page shell (hero, footer) borrows the widget's published scheme so the
 * wall reads as one designed page, not a fragment dropped on a white void.
 * "system" walls shell as light — the fragment handles its own media switch.
 */
export function wallShellTheme(payload: PublicWallPayload): WallShellTheme {
  const snapshot = payload.widget.publishedSnapshot.derivedTheme;
  const dark = snapshot.appearance === "dark";
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
    dark,
    fontFamily: scheme.fontFamily,
  };
}
