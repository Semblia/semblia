/**
 * Server-side API helpers for Next.js server components and route handlers.
 * Uses `@clerk/nextjs/server` to retrieve the auth token.
 */

import { auth } from "@clerk/nextjs/server";
import {
  fetchCurrentUser,
  fetchLastUsedProject,
  fetchProjectBySlug,
  fetchProjects,
  claimProjectMemberInvites,
  ApiError,
} from "./semblia-api";
import type {
  V2ProjectDTO,
  V2UserDTO,
  V2PaginatedResponse,
} from "@workspace/types";

async function getServerToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}

export async function serverFetchCurrentUser(): Promise<V2UserDTO> {
  const token = await getServerToken();
  return fetchCurrentUser(token);
}

/**
 * Why a project is unavailable, so a page can render the honest surface.
 *
 * `forbidden` and `missing` were previously indistinguishable to callers: a 403
 * escaped as a thrown ApiError and hit the route boundary, which offered a
 * "Try again" for a permission failure that can never succeed. And answering a
 * 403 with `notFound()` would be its own lie — the project exists, the viewer
 * just isn't on it, and telling them otherwise leaks nothing but helps nobody.
 */
export type ProjectAccess =
  | { status: "ok"; project: V2ProjectDTO }
  | { status: "forbidden" }
  | { status: "missing" };

export async function serverFetchProjectAccess(
  slug: string,
): Promise<ProjectAccess> {
  const token = await getServerToken();
  try {
    return { status: "ok", project: await fetchProjectBySlug(token, slug) };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return { status: "missing" };
      if (error.status === 401 || error.status === 403) {
        return { status: "forbidden" };
      }
    }
    throw error;
  }
}

/**
 * Absent-or-null variant for the ~15 project pages that only need the project.
 *
 * A permission denial must not throw from here. Every one of those pages
 * fetches the project itself, so a thrown 403 reached `[slug]/error.tsx` before
 * the layout's access guard could render anything — and that boundary offers a
 * "Try again" for a failure that can never succeed. The layout owns the honest
 * answer via {@link serverFetchProjectAccess} and short-circuits its children,
 * so the `notFound()` these pages call on `null` is a backstop, not the path.
 */
export async function serverFetchProjectBySlug(
  slug: string,
): Promise<V2ProjectDTO | null> {
  const access = await serverFetchProjectAccess(slug);
  return access.status === "ok" ? access.project : null;
}

/**
 * The account's last-used project slug, or `null`.
 *
 * `null` covers every reason there is nothing to go back to: a first sign-in,
 * a project since deleted, access since revoked (the API re-checks access
 * before answering), or the API being unreachable. All of them mean the same
 * thing to the caller — show the project list — so none of them throws. A
 * sign-in must never fail because a convenience lookup did.
 */
export async function serverFetchLastUsedProjectSlug(): Promise<string | null> {
  try {
    const token = await getServerToken();
    const { project } = await fetchLastUsedProject(token);
    return project?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Best-effort auto-claim of any pending project invites addressed to this
 * account's email — run before `/continue` resolves where a completed
 * sign-in lands.
 *
 * Deliberately silent and non-blocking: a sign-in must never fail, stall, or
 * even flicker because a convenience claim did. The explicit
 * `/invitations/:inviteId` page — the address the invite email itself links
 * to — remains the durable, honest path; this only shortcuts the common case
 * where the invitee signs in some other way before ever opening that link.
 */
export async function serverClaimProjectMemberInvites(): Promise<void> {
  try {
    const token = await getServerToken();
    // Bounded: /continue must not hang on a slow claim call. If it does not
    // resolve quickly the invite stays claimable from its own link, so we
    // stop waiting and let the redirect proceed.
    await Promise.race([
      claimProjectMemberInvites(token),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("claim-timeout")), 3000),
      ),
    ]);
  } catch {
    // Best-effort — see doc comment above. Nothing to recover: the invite
    // (if any) simply stays claimable from its own link.
  }
}

export async function serverFetchProjects(params?: {
  page?: number;
  pageSize?: number;
}): Promise<V2PaginatedResponse<V2ProjectDTO>> {
  const token = await getServerToken();
  return fetchProjects(token, params);
}
