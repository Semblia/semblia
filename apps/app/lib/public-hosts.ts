/**
 * Public URLs come from API-issued `PublicSurfaceHost` rows — the project's
 * current slug is never authority to reconstruct a hostname (it is mutable;
 * issued hosts are not). This module is the app's one reader of those rows;
 * the hardcoded `forms.semblia.com/f`, `semblia.com/wall`, and
 * `<slug>.testimonials.semblia.com` generators it replaces are gone (WS-A1).
 */

import type {
  V2ProjectDTO,
  V2PublicSurfaceFeature,
  V2PublicSurfaceHostDTO,
} from "@workspace/types";

/** Serving right now: ACTIVE, verified, not retired. */
export function isLiveHost(host: V2PublicSurfaceHostDTO): boolean {
  return (
    host.status === "ACTIVE" &&
    host.verifiedAt !== null &&
    host.retiredAt === null
  );
}

/**
 * The single live default host for a feature, or null. Zero means nothing
 * was issued (or it is pending verification); two is a default conflict —
 * both mean "there is no public address", which callers must say instead of
 * inventing one.
 */
export function defaultLiveHost(
  hosts: V2PublicSurfaceHostDTO[] | null | undefined,
  feature: V2PublicSurfaceFeature,
): V2PublicSurfaceHostDTO | null {
  const defaults = (hosts ?? []).filter(
    (host) =>
      host.feature === feature &&
      host.resourceType === "PROJECT" &&
      host.isDefault &&
      isLiveHost(host),
  );
  return defaults.length === 1 ? (defaults[0] ?? null) : null;
}

export function collectionHostname(
  project: Pick<V2ProjectDTO, "publicSurfaceHosts"> | null | undefined,
): string | null {
  return (
    defaultLiveHost(project?.publicSurfaceHosts, "COLLECTION")?.hostname ?? null
  );
}

export function wallHostname(
  project: Pick<V2ProjectDTO, "publicSurfaceHosts"> | null | undefined,
): string | null {
  return defaultLiveHost(project?.publicSurfaceHosts, "WALL")?.hostname ?? null;
}

/** `https://<host>/f/<formSlug>` — a hosted form on its issued host. */
export function hostedFormLink(
  hostname: string | null | undefined,
  formSlug: string | null | undefined,
): string | null {
  if (!hostname || !formSlug) return null;
  return `https://${hostname}/f/${encodeURIComponent(formSlug)}`;
}

/** The wall host's root — where the primary wall lives. */
export function wallRootLink(
  hostname: string | null | undefined,
): string | null {
  return hostname ? `https://${hostname}/` : null;
}

/** `https://<host>/w/<wallSlug>` — a named wall on its issued host. */
export function wallLink(
  hostname: string | null | undefined,
  wallSlug: string | null | undefined,
): string | null {
  if (!hostname || !wallSlug) return null;
  return `https://${hostname}/w/${encodeURIComponent(wallSlug)}`;
}

/**
 * Pre-create preview ONLY. Before a project exists there is no issued host,
 * so onboarding/create previews show the shape the API will issue for the
 * chosen slug. Never use these for a project that already exists — read its
 * `publicSurfaceHosts` instead.
 */
export const FORMS_BASE_DOMAIN = "forms.semblia.com";
export const WALLS_BASE_DOMAIN = "walls.semblia.com";

export function previewCollectionHostname(slug: string): string {
  return `${slug}.${FORMS_BASE_DOMAIN}`;
}

export function previewWallHostname(slug: string): string {
  return `${slug}.${WALLS_BASE_DOMAIN}`;
}
