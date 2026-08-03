import {
  isReservedProjectSlug,
  type V2ProjectDTO,
  type V2ProjectMemberRole,
} from "@workspace/types";
import { humanizeLabel } from "@/lib/format";

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

// ── Permission ───────────────────────────────────────────────────────────────
//
// Every settings write (`PATCH /v2/projects/:slug`, allowed origins, signing
// secret, delete, ownership transfer) is guarded by MANAGE_PROJECT; membership
// writes by MANAGE_MEMBERS. Reading the capability here means the surface can
// disable the action *and say why* rather than letting the click return a 403.

/** True when the viewer may write project settings. */
export function canManageProject(project: V2ProjectDTO): boolean {
  return project.access.capabilities.includes("MANAGE_PROJECT");
}

/** True when the viewer may invite, re-role, or remove members. */
export function canManageMembers(project: V2ProjectDTO): boolean {
  return project.access.capabilities.includes("MANAGE_MEMBERS");
}

/** The one sentence shown wherever a view-only role meets a write control. */
export const READ_ONLY_REASON =
  "Your role on this project is view-only. A project owner or admin can change these settings.";

// ── Role display ─────────────────────────────────────────────────────────────

const PROJECT_ROLE_LABEL: Record<V2ProjectMemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

/**
 * One role vocabulary for every settings surface that names a role — the member
 * list and the ownership-transfer picker had drifted into two.
 *
 * The API can grow a role before this build knows it, so the lookup ends in a
 * humanized fallback rather than the raw value: `BILLING_ADMIN` must never reach
 * a user's eyes, and lowercasing it to `billing_admin` is the same defect.
 */
export function projectRoleLabel(role: string): string {
  return (
    PROJECT_ROLE_LABEL[role as V2ProjectMemberRole] ??
    humanizeLabel(role.toLowerCase())
  );
}

// ── Field validation ─────────────────────────────────────────────────────────
//
// Every rule below mirrors a schema the API already enforces. They exist so the
// save affordance is never offered for a value the API will reject: a disabled
// Save with the reason beside the field beats a 400 and a red toast.

/** The API's `name: z.string().trim().min(1).max(255)`. */
export const PROJECT_NAME_MAX = 60;

export function validateProjectName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a project name.";
  if (trimmed.length > PROJECT_NAME_MAX) {
    return `Keep the name to ${PROJECT_NAME_MAX} characters or fewer.`;
  }
  return null;
}

/**
 * Client-side mirror of `projectSlugSchema` in
 * `apps/api_v2/src/modules/projects/projects.dto.ts`, which requires the slug to
 * be simultaneously a valid DNS label (it becomes `<slug>.testimonials.…`) and a
 * non-reserved dashboard route segment.
 *
 * The route half reuses the shared `isReservedProjectSlug` set — one list, two
 * enforcers. The hosted half mirrors `SEMBLIA_FREE_HOST_RESERVED_LABELS` in
 * `apps/api_v2/src/modules/public-surfaces/public-hostname.ts`; keep the two in
 * sync if that set grows.
 */
const SLUG_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

const RESERVED_HOST_LABELS: ReadonlySet<string> = new Set([
  "www",
  "app",
  "api",
  "admin",
  "assets",
  "static",
  "cdn",
  "status",
  "support",
  "help",
  "mail",
  "autodiscover",
  "forms",
  "walls",
]);

export function validateProjectSlug(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a slug.";
  if (!SLUG_LABEL.test(trimmed)) {
    return "Use lowercase letters, numbers, and hyphens — no leading or trailing hyphen.";
  }
  if (RESERVED_HOST_LABELS.has(trimmed) || isReservedProjectSlug(trimmed)) {
    return `“${trimmed}” is reserved by Semblia. Pick another slug.`;
  }
  return null;
}

/** The API's `websiteUrl: z.string().url().nullable()`. Blank means "unset". */
export function validateWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Enter a full URL, starting with https://";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Only http:// and https:// addresses are accepted.";
  }
  return null;
}

/** The API's invite `email` schema: trimmed, ≤320 chars, RFC-shaped. */
export function validateInviteEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter an email address.";
  if (trimmed.length > 320) return "That email address is too long.";
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) {
    return "Enter a complete email address, like teammate@company.com.";
  }
  return null;
}

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
const LOCAL_LOOPBACK_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
]);

/** True for the http://localhost-style origins allowed outside prod. */
function isLocalHttpLoopback(url: URL): boolean {
  return (
    url.protocol.toLowerCase() === "http:" &&
    LOCAL_LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
  );
}

/** Shape rules shared by every origin: nothing beyond scheme://host[:port]. */
function originShapeError(url: URL, trimmed: string): string | null {
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
  return null;
}

export function validateAllowedOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Origin is required";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Must be a valid absolute URL";
  }

  const shapeError = originShapeError(url, trimmed);
  if (shapeError) return shapeError;

  if (url.protocol.toLowerCase() === "https:") return null;
  if (isLocalHttpLoopback(url)) return null;
  return "Must use https:// (localhost http allowed)";
}
