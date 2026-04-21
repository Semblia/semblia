"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { List as MenuIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ProjectSidebarNav } from "@/components/nav/project-sidebar";

// ── Mobile drawer trigger (project context only) ──────────────────────────────

export function MobileNavTrigger({ slug }: { slug: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Auto-close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-muted-foreground hover:text-foreground"
        aria-label="Open project navigation"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="size-4" />
      </Button>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Project navigation</SheetTitle>
        <div className="flex h-full flex-col pt-4">
          <ProjectSidebarNav slug={slug} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
