"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Global footer. Pads itself on `lg` when inside a project scope so it
 * doesn't underlap the fixed `ProjectSidebar`.
 */
export function AppFooter() {
  const pathname = usePathname();
  const inProject = /^\/projects\/[^/]+/.test(pathname);

  return (
    <footer
      className={cn(
        "border-t border-border bg-muted/20 px-6 py-4",
        inProject && "lg:pl-[calc(14rem+1.5rem)]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Semblia
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://semblia.com/docs"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </a>
          <a
            href="https://semblia.com/changelog"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Changelog
          </a>
          <a
            href="mailto:support@semblia.com"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
