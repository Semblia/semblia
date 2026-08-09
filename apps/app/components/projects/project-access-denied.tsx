import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared";
import { homePath } from "@/lib/routes";

/**
 * What a member sees when their access to a project has been removed.
 *
 * Until now a 403 or 401 on a project propagated to `[slug]/error.tsx`, which
 * renders the generic route error — "we hit an unexpected error… try again".
 * Retrying a permission denial can never succeed, and telling someone to retry
 * something that cannot work is the defect this whole pass exists to remove.
 * So the permanent failures get their own surface, with no retry on it.
 */
export function ProjectAccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col">
      <ErrorState
        resource="this project"
        variant="forbidden"
        action={
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href={homePath()}>Back to projects</Link>
          </Button>
        }
      />
    </div>
  );
}
