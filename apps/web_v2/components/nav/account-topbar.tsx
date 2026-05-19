"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { TrestaMark } from "./tresta-mark";
import { BreadcrumbSlash } from "./breadcrumb-slash";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { HelpDropdown } from "./help-dropdown";
import { AccountMobileNav } from "./account-sidebar";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  profile: "Profile",
  security: "Security",
  billing: "Billing",
  notifications: "Notifications",
  defaults: "Defaults",
};

function sectionLabelFor(pathname: string): string | null {
  const segment = pathname.replace(/^\/account\/?/, "").split("/")[0];
  return segment ? (SECTION_LABELS[segment] ?? null) : null;
}

// ── Account topbar ─────────────────────────────────────────────────────────────

export function AccountTopbar() {
  const pathname = usePathname();
  const section = sectionLabelFor(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border/80 bg-background/85 px-5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:px-6">
      {/* ── Left cluster ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AccountMobileNav />
        <TrestaMark />
        <BreadcrumbSlash />
        <span className="text-xs font-medium text-muted-foreground">
          Account
        </span>
        {section && (
          <>
            <BreadcrumbSlash />
            <span className="truncate text-xs font-medium text-foreground">
              {section}
            </span>
          </>
        )}
      </div>

      {/* ── Right cluster ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <HelpDropdown />
        <NotificationBell />
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
