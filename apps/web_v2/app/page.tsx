import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  serverFetchLastUsedProject,
  serverFetchProjectBySlug,
} from "@/lib/semblia-api-server";

export default async function RootPage() {
  // Prefer the server-backed project pointer. The legacy cookie remains as a
  // rollout bridge for existing sessions until their first DB-backed write.
  const store = await cookies();
  const last = store.get("last_project")?.value;

  let target: string | null = null;
  try {
    const lastUsed = await serverFetchLastUsedProject();
    if (lastUsed.project) target = `/projects/${lastUsed.project.slug}`;
  } catch {
    // Network/auth hiccup — try the legacy cookie before falling back.
  }

  if (last) {
    try {
      if (!target) {
        const project = await serverFetchProjectBySlug(last);
        if (project) target = `/projects/${project.slug}`;
      }
    } catch {
      // Network/auth hiccup — fall back to the index rather than erroring.
    }
  }

  redirect(target ?? "/projects");
}
