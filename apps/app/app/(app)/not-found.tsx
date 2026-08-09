import Link from "next/link";
import {
  Compass as CompassIcon,
  House as HomeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { homePath } from "@/lib/routes";

/**
 * 404 inside the signed-in app.
 *
 * Without this, `notFound()` from a project route bubbled all the way to the
 * root boundary, which renders a full-screen page with no sidebar — so a
 * mistyped project slug ejected the user out of the app entirely and their only
 * way back was a single button. This keeps the shell, so the project switcher
 * and every other destination stay one click away.
 */
export default function AppNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <CompassIcon className="size-5" weight="bold" aria-hidden />
      </span>

      <h1 className="mt-4 font-heading text-base font-semibold tracking-tight text-foreground">
        Couldn&rsquo;t find that page
      </h1>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
        The project or record you followed may have been renamed, deleted, or
        moved to another workspace. Pick a project from the sidebar, or start
        from the list.
      </p>

      <div className="mt-5">
        <Button asChild size="sm" className="gap-1.5 text-xs">
          <Link href={homePath()}>
            <HomeIcon className="size-3.5" weight="bold" aria-hidden />
            Back to projects
          </Link>
        </Button>
      </div>
    </div>
  );
}
