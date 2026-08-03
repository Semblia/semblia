"use client";

/**
 * Whether this account may create another project.
 *
 * The API enforces a per-plan project limit and answers a create over the cap
 * with a flat 403. Nothing in the UI read the plan, so a Free-plan user (limit
 * 1) was walked through the entire create form and met the refusal as a raw
 * toast — with no plan name, no limit, and no route to billing. On the Free
 * plan that was the *default* experience of the second project.
 *
 * Reading usage once here lets both create affordances disable themselves and
 * state the reason in place, which is the rule: never offer an action the
 * contract will refuse.
 *
 * Fails open. If the usage call itself fails we do not know the limit, and
 * blocking creation on a metadata request would invent a refusal the API never
 * made — the server stays the authority either way.
 */

import { useBillingUsage } from "@/hooks/api";

export interface ProjectLimit {
  /** True only when usage is known *and* the cap is reached. */
  atLimit: boolean;
  /** Sentence to show in place of the action. `null` when creation is allowed. */
  reason: string | null;
  used: number | null;
  limit: number | null;
}

/**
 * The usage record, or `null` when it can't be trusted as a limit.
 *
 * `limit > 0` matters as much as finiteness, and is the same guard the
 * account usage reader applies (`components/account/usage-summary.tsx`).
 * The API's `asLimit` passes a stored plan record through untouched, so a
 * non-positive limit is reachable — and `used >= 0` would then read as
 * "at limit" forever, refusing creation the server would have allowed and
 * saying "Your plan includes 0 projects". An unusable number is an unknown
 * limit, and an unknown limit fails open.
 */
function usableProjectUsage<T extends { used: number; limit: number }>(
  projects: T | undefined,
): T | null {
  if (!projects) return null;
  if (!Number.isFinite(projects.limit) || projects.limit <= 0) return null;
  if (!Number.isFinite(projects.used)) return null;
  return projects;
}

export function useProjectLimit(): ProjectLimit {
  const usageQuery = useBillingUsage();
  const projects = usableProjectUsage(usageQuery.data?.projects);

  if (!projects) {
    return { atLimit: false, reason: null, used: null, limit: null };
  }

  const atLimit = projects.used >= projects.limit;
  return {
    atLimit,
    reason: atLimit
      ? `Your plan includes ${projects.limit} project${projects.limit === 1 ? "" : "s"} and all ${projects.limit} are in use. Upgrade to add another.`
      : null,
    used: projects.used,
    limit: projects.limit,
  };
}
