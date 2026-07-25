import Link from "next/link";
import {
  Compass as CompassIcon,
  House as HomeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

/**
 * Branded 404. Replaces Next.js's bare default so a mistyped or stale URL
 * lands on a calm, on-system page instead of an abrupt error-looking screen.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Empty className="border-none bg-transparent">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-10 [&_svg:not([class*='size-'])]:size-5"
          >
            <CompassIcon weight="duotone" />
          </EmptyMedia>
          <EmptyTitle className="text-base">Page not found</EmptyTitle>
          <EmptyDescription>
            The page you&rsquo;re looking for doesn&rsquo;t exist or may have
            moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/">
              <HomeIcon className="size-3.5" weight="bold" aria-hidden />
              Back to projects
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
