"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserCircleIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  BellIcon,
  KeyIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ── Nav model ──────────────────────────────────────────────────────────────────

interface AccountNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const NAV: AccountNavItem[] = [
  { label: "Profile", href: "/account/profile", icon: UserCircleIcon },
  { label: "Security", href: "/account/security", icon: ShieldCheckIcon },
  { label: "Billing", href: "/account/billing", icon: CreditCardIcon },
  {
    label: "Notifications",
    href: "/account/notifications",
    icon: BellIcon,
    disabled: true,
  },
  { label: "API Keys", href: "/account/api-keys", icon: KeyIcon },
  {
    label: "Defaults",
    href: "/account/defaults",
    icon: SlidersHorizontalIcon,
    disabled: true,
  },
];

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
      <div className="px-3 pt-5 pb-3">
        <div className="flex items-center gap-2 px-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
            <UserCircleIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              Account settings
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              Profile, billing &amp; security
            </p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          Account
        </span>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 space-y-0.5 px-2"
        aria-label="Account navigation"
        onClick={onNavigate}
      >
        {NAV.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item)} />
        ))}
      </nav>

      {/* Footer hint */}
      <div className="mt-auto border-t border-border/60 px-4 py-3">
        <Link
          href="/projects"
          className="text-[10px] leading-snug text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to projects
        </Link>
      </div>
    </div>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────

export function AccountSidebar() {
  return (
    <aside
      style={{ top: "3.5rem", height: "calc(100svh - 3.5rem)" }}
      className={cn(
        "fixed left-0 z-20 hidden w-56 overflow-y-auto border-r border-border bg-background lg:flex lg:flex-col",
      )}
      aria-label="Account sidebar"
    >
      <AccountSidebarNav />
    </aside>
  );
}
