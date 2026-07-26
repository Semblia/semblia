"use client";

/**
 * AppShell — the layout every signed-in surface renders in.
 *
 * A fixed-height frame: the sidebar owns the full viewport height and the
 * content column is its own scroll container. Page chrome inside `main` can
 * therefore stick to `top-0` with no knowledge of the shell — the old
 * `top-[3.25rem]` topbar offset that every header and toolbar had to hard-code
 * is gone.
 */

import * as React from "react";
import { AppSidebar, AppMobileBar } from "./app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
