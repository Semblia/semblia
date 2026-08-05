import { redirect } from "next/navigation";
import { homePath, projectPath } from "@/lib/routes";
import { serverFetchLastUsedProjectSlug } from "@/lib/semblia-api-server";

/**
 * Post-sign-in resolver — the front door for an account that already has one.
 *
 * The API has recorded a last-used project since the beginning (every project
 * page writes it via `RememberLastProject`), and `GET /me/last-used-project`
 * re-checks access before answering. Nothing read it: sign-in, the SSO
 * callback and the signed-in forward gate all landed on `/`, so an owner with
 * one project picked it out of a list every single time.
 *
 * This route is the only reader, which keeps `/` as the project list — the
 * sidebar's "Projects" link has to stay reachable, so `/` itself must not
 * redirect.
 *
 * No UI: it resolves and forwards. `redirect()` throws, so nothing renders.
 */
export const dynamic = "force-dynamic";

export default async function ContinuePage() {
  const slug = await serverFetchLastUsedProjectSlug();
  redirect(slug ? projectPath(slug) : homePath());
}
