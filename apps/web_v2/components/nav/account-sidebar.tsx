"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircleIcon, ListIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ACCOUNT_NAV, type AccountNavItem } from "./account-nav";

// ── Single nav row ─────────────────────────────────────────────────────────────

function NavRow({ item, active }: { item: AccountNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.disabled ? "#" : item.href}
      aria-current={active ? "page" : undefined}
      aria-disabled={item.disabled}
      tabIndex={item.disabled ? -1 : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        item.disabled
          ? "pointer-events-none opacity-40"
          : active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {active && !item.disabled && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"
          aria-hidden
        />
      )}
      <Icon
        weight={active ? "fill" : "regular"}
        className={cn(
          "size-3.5 shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground/80",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

// ── Reusable nav ───────────────────────────────────────────────────────────────

export function AccountSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (item: AccountNavItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="flex h-full flex-col">
      {/* Identity header */}
      <div className="px-3 pt-5 pb-4">
        <div className="flex items-center gap-2 px-1.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
            <UserCircleIcon className="size-3.5 text-muted-foreground" />
          </span>
          <p className="truncate text-xs font-semibold text-foreground">
            Account
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 space-y-0.5 px-2"
        aria-label="Account navigation"
        onClick={onNavigate}
      >
        {ACCOUNT_NAV.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item)} />
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-border px-3 py-3">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <span aria-hidden>←</span>
          Back to projects
        </Link>
      </div>
    </div>
  );
}

// ── Mobile nav (Sheet) ─────────────────────────────────────────────────────────

export function AccountMobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Open account navigation"
        >
          <ListIcon className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-56 p-0">
        <AccountSidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────

export function AccountSidebar() {
  return (
    <aside
      style={{ top: "3.25rem", height: "calc(100svh - 3.25rem)" }}
      className={cn(
        "fixed left-0 z-20 hidden w-56 overflow-y-auto border-r border-border bg-background lg:flex lg:flex-col",
      )}
      aria-label="Account sidebar"
    >
      <AccountSidebarNav />
    </aside>
  );
}
