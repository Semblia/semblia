/**
 * Public wall data layer — server-side only.
 *
 * Fetches `GET /v2/walls/:wallSlug` (public, Redis-cached API) and adapts it
 * for the hosted wall page: typed payload, render items for the shared
 * widgets-core SSR renderer, rating stats for the hero + JSON-LD, and the
 * published theme scheme that colours the page shell around the fragment.
 */

import {
  widgetDefinitionDocSchema,
  widgetPublishedSnapshotSchema,
  type PublishedWidgetDoc,
  WidgetDefinitionDoc,
  WidgetPublishedSnapshot,
} from "@workspace/widgets-core/schema";
import type { WidgetRenderItem } from "@workspace/widgets-core/render";
import type { V2PublicSurfaceResolutionDTO } from "@workspace/types";
import { projectWallHostname } from "./host-routing";

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
  seo: { canonicalUrl: string; indexable: boolean; reason: string };
}

export class PublicWallUnavailableError extends Error {}

type ApiEnvelope<T> = { success: true; data: T };

async function readPublicResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 404) return null;
  if (!response.ok) throw new PublicWallUnavailableError();
  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    throw new PublicWallUnavailableError();
  }
  if (
    !envelope ||
    typeof envelope !== "object" ||
    (envelope as { success?: unknown }).success !== true ||
    !("data" in envelope)
  ) {
    throw new PublicWallUnavailableError();
  }
  return (envelope as ApiEnvelope<T>).data;
}

function apiUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`/v2${path}`, API_BASE);
  for (const [key, value] of Object.entries(params ?? {}))
    url.searchParams.set(key, value);
  return url.toString();
}

function publicFetch(path: string, params?: Record<string, string>) {
  return fetch(apiUrl(path, params), {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    throw new PublicWallUnavailableError();
  });
}

function isWallResolution(
  value: unknown,
  hostname: string,
): value is V2PublicSurfaceResolutionDTO {
  if (!value || typeof value !== "object") return false;
  const resolution = value as Partial<V2PublicSurfaceResolutionDTO>;
  const project = resolution.project;
  return (
    resolution.feature === "WALL" &&
    resolution.requestedHostname === hostname &&
    typeof resolution.canonicalHostname === "string" &&
    projectWallHostname(resolution.canonicalHostname) !== null &&
    typeof resolution.canonicalUrl === "string" &&
    resolution.canonicalUrl === `https://${resolution.canonicalHostname}` &&
    typeof resolution.isCanonical === "boolean" &&
    (resolution.resourceType === "PROJECT" ||
      resolution.resourceType === "WIDGET") &&
    typeof resolution.resourceId === "string" &&
    typeof project?.id === "string" &&
    typeof project.slug === "string" &&
    typeof project.name === "string" &&
    (project.websiteUrl === null || typeof project.websiteUrl === "string") &&
    (project.brandColorPrimary === null ||
      typeof project.brandColorPrimary === "string") &&
    (project.brandColorSecondary === null ||
      typeof project.brandColorSecondary === "string") &&
    Array.isArray(resolution.walls) &&
    resolution.walls.every(
      (wall) =>
        typeof wall?.widgetId === "string" &&
        typeof wall.wallSlug === "string" &&
        typeof wall.title === "string" &&
        typeof wall.subhead === "string" &&
        typeof wall.endpoint === "string" &&
        (wall.publicUrl === null || typeof wall.publicUrl === "string") &&
        typeof wall.isPrimaryWall === "boolean",
    )
  );
}

function isPublicWallPayload(
  value: unknown,
  wallSlug: string,
): value is PublicWallPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<PublicWallPayload>;
  const widget = payload.widget;
  const project = payload.project;
  return (
    typeof widget?.id === "string" &&
    typeof widget.name === "string" &&
    widget.wall !== null &&
    widget.wall?.slug === wallSlug &&
    typeof widget.wall.title === "string" &&
    typeof widget.wall.subhead === "string" &&
    widgetDefinitionDocSchema.safeParse(widget.definition).success &&
    widgetPublishedSnapshotSchema.safeParse(widget.publishedSnapshot).success &&
    typeof widget.behavior?.showBranding === "boolean" &&
    (project === null ||
      (project !== undefined &&
        typeof project.name === "string" &&
        (project.websiteUrl === null ||
          typeof project.websiteUrl === "string"))) &&
    Array.isArray(payload.testimonials) &&
    payload.testimonials.every(
      (testimonial) =>
        typeof testimonial?.id === "string" &&
        typeof testimonial.authorName === "string" &&
        (testimonial.authorRole === null ||
          typeof testimonial.authorRole === "string") &&
        (testimonial.authorCompany === null ||
          typeof testimonial.authorCompany === "string") &&
        (testimonial.authorAvatar === null ||
          typeof testimonial.authorAvatar?.url === "string") &&
        typeof testimonial.content === "string" &&
        (testimonial.rating === null ||
          typeof testimonial.rating === "number") &&
        (testimonial.source === null ||
          typeof testimonial.source === "string") &&
        (testimonial.sourceUrl === null ||
          typeof testimonial.sourceUrl === "string") &&
        typeof testimonial.createdAt === "string",
    ) &&
    typeof payload.seo?.canonicalUrl === "string" &&
    /^https:\/\//.test(payload.seo.canonicalUrl) &&
    typeof payload.seo.indexable === "boolean" &&
    typeof payload.seo.reason === "string"
  );
}

/** Host-bound API resolver for project-wall routes and Task 14 resources. */
export async function resolveProjectWallHost(
  hostname: string,
): Promise<V2PublicSurfaceResolutionDTO | null> {
  const normalized = projectWallHostname(hostname);
  if (!normalized) return null;
  const result = await readPublicResponse<unknown>(
    await publicFetch("/public-surfaces/resolve", {
      hostname: normalized,
      feature: "WALL",
    }),
  );
  if (result === null) return null;
  if (!isWallResolution(result, normalized))
    throw new PublicWallUnavailableError();
  return result;
}

/** Host-bound wall adapter. It deliberately has no Next/ISR cache. */
export async function fetchProjectWall(
  hostname: string,
  wallSlug: string,
): Promise<PublicWallPayload | null> {
  const normalized = projectWallHostname(hostname);
  if (!normalized) return null;
  const result = await readPublicResponse<unknown>(
    await publicFetch(`/walls/${encodeURIComponent(wallSlug)}`, {
      hostname: normalized,
    }),
  );
  if (result === null) return null;
  if (!isPublicWallPayload(result, wallSlug))
    throw new PublicWallUnavailableError();
  return result;
}

export async function preflightProjectWall(
  hostname: string,
  wallSlug?: string,
): Promise<"ok" | "not-found"> {
  const resolution = await resolveProjectWallHost(hostname);
  if (!resolution) return "not-found";
  const primaries = resolution.walls.filter((wall) => wall.isPrimaryWall);
  if (primaries.length !== 1) return "not-found";
  const primary = primaries[0];
  const target = wallSlug
    ? resolution.walls.find((wall) => wall.wallSlug === wallSlug)
    : primary;
  if (!target) return "not-found";
  return (await fetchProjectWall(
    projectWallHostname(hostname)!,
    target.wallSlug,
  ))
    ? "ok"
    : "not-found";
}

/** Returns null on 404 (unknown/paused wall) so the page can `notFound()`. */
/** Legacy apex /wall/:slug compatibility adapter; it is intentionally not host-bound. */
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
  const result = await readPublicResponse<unknown>(
    await publicFetch(`/walls/${encodeURIComponent(wallSlug)}`),
  );
  if (result === null) return null;
  if (!isPublicWallPayload(result, wallSlug))
    throw new PublicWallUnavailableError();
  return result;
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
