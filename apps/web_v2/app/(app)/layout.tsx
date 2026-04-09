import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/nav/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border bg-muted/30 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <p className="text-[11px] text-muted-foreground">
                &copy; {new Date().getFullYear()} Tresta
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://tresta.io/docs"
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Docs
                </a>
                <a
                  href="https://tresta.io/changelog"
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Changelog
                </a>
                <a
                  href="mailto:support@tresta.io"
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Support
                </a>
              </div>
            </div>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
