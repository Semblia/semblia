import type { V2ProjectDTO } from "@workspace/types";

export type PlatformKey =
  | "twitter"
  | "linkedin"
  | "github"
  | "youtube"
  | "instagram"
  | "facebook";

export const KNOWN_PLATFORMS: PlatformKey[] = [
  "twitter",
  "linkedin",
  "github",
  "youtube",
  "instagram",
  "facebook",
];

export interface CustomSocialLink {
  platformName: string;
  platformUrl: string;
  profileUrl: string;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  custom?: CustomSocialLink[];
}

export function recordToSocialLinks(
  record: Record<string, string> | null,
): SocialLinks {
  if (!record) return {};
  const result: SocialLinks = {};
  const custom: CustomSocialLink[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (KNOWN_PLATFORMS.includes(key as PlatformKey)) {
      (result as Record<string, string>)[key] = value;
    } else {
      custom.push({ platformName: key, platformUrl: "", profileUrl: value });
    }
  }
  if (custom.length > 0) result.custom = custom;
  return result;
}

export function socialLinksToRecord(
  links: SocialLinks,
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of KNOWN_PLATFORMS) {
    const val = links[key];
    if (val) record[key] = val;
  }
  for (const c of links.custom ?? []) {
    if (c.platformName && c.profileUrl) {
      record[c.platformName] = c.profileUrl;
    }
  }
  return record;
}

export function normalizeProject(p: V2ProjectDTO) {
  return {
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    projectType: p.projectType ?? null,
    visibility: p.visibility,
    autoModeration: p.autoModeration,
    autoApproveVerified: p.autoApproveVerified,
    profanityFilterLevel: p.profanityFilterLevel ?? "OFF",
    logoAssetId: p.logo?.id ?? null,
    brandColorPrimary: p.brandColorPrimary ?? "",
    brandColorSecondary: p.brandColorSecondary ?? "",
    websiteUrl: p.websiteUrl ?? "",
    socialLinks: recordToSocialLinks(p.socialLinks),
    tags: p.tags ?? [],
  } as const;
}

export type NormalizedProject = ReturnType<typeof normalizeProject>;

/**
 * Client-side mirror of the backend `allowedOriginSchema` validation rules in
 * `apps/api_v2/src/modules/projects/projects.dto.ts`. Returns an error string,
 * or `null` when the value is acceptable.
 *
 * Rules:
 *   - must parse as URL
 *   - no credentials, query, fragment, wildcards, path, or trailing slash
 *   - value must equal `url.origin` exactly
 *   - https:// only, except http://localhost / 127.0.0.1 / [::1] outside prod
 */
export function validateAllowedOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Origin is required";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Must be a valid absolute URL";
  }

  if (url.username || url.password) return "Must not include credentials";
  if (trimmed.includes("*")) return "Must not include wildcards";
  if (url.search) return "Must not include a query string";
  if (url.hash) return "Must not include a fragment";
  if (trimmed.startsWith(`${url.origin}/`)) {
    return "Must not include a trailing slash or path";
  }
  if (trimmed !== url.origin) {
    return "Must be exactly scheme://host[:port]";
  }

  const protocol = url.protocol.toLowerCase();
  const host = url.hostname.toLowerCase();
  const isLocalHttp =
    protocol === "http:" &&
    (host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "::1");

  if (protocol === "https:") return null;
  if (isLocalHttp) return null;
  return "Must use https:// (localhost http allowed)";
}
