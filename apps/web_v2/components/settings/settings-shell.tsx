"use client";

/**
 * SettingsShell — shared page chrome for the project Settings area.
 *
 * Mirrors `DeveloperShell`: a PageHeader with a sticky sub-tab toolbar.
 * Each sub-route owns its own client and renders inside `children`.
 */

import * as React from "react";
import Link from "next/link";
import {
  IdentificationCardIcon,
  PaintBrushIcon,
  EyeIcon,
  ShareNetworkIcon,
  GlobeIcon,
  ShieldCheckIcon,
  UsersIcon,
  WarningIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared";

export type SettingsSection =
  | "general"
  | "branding"
  | "visibility"
  | "social"
  | "hosts"
  | "trust"
  | "members"
  | "danger";

interface TabSpec {
  id: SettingsSection;
  label: string;
  href: (slug: string) => string;
  icon: PhosphorIcon;
}

const SUB_TABS: TabSpec[] = [
  {
    id: "general",
    label: "General",
    href: (slug) => `/projects/${slug}/settings`,
    icon: IdentificationCardIcon,
  },
  {
    id: "branding",
    label: "Branding",
    href: (slug) => `/projects/${slug}/settings/branding`,
    icon: PaintBrushIcon,
  },
  {
    id: "visibility",
    label: "Visibility",
    href: (slug) => `/projects/${slug}/settings/visibility`,
    icon: EyeIcon,
  },
  {
    id: "social",
    label: "Social",
    href: (slug) => `/projects/${slug}/settings/social`,
    icon: ShareNetworkIcon,
  },
  {
    id: "hosts",
    label: "Hosts",
    href: (slug) => `/projects/${slug}/settings/hosts`,
    icon: GlobeIcon,
  },
  {
    id: "trust",
    label: "Trust",
    href: (slug) => `/projects/${slug}/settings/trust`,
    icon: ShieldCheckIcon,
  },
  {
    id: "members",
    label: "Members",
    href: (slug) => `/projects/${slug}/settings/members`,
    icon: UsersIcon,
  },
  {
    id: "danger",
    label: "Danger",
    href: (slug) => `/projects/${slug}/settings/danger`,
    icon: WarningIcon,
  },
];

function SubTabs({ slug, active }: { slug: string; active: SettingsSection }) {
  return (
    <div
      role="tablist"
      aria-label="Settings sections"
      className="scrollbar-none -my-2.5 flex min-w-0 items-center gap-0 overflow-x-auto"
    >
      {SUB_TABS.map((tab) => {
        const on = tab.id === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href(slug)}
            role="tab"
            aria-selected={on}
            className={cn(
              "group relative inline-flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-medium",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand",
              "after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-full after:rounded-full",
              "after:transition-[transform,opacity] after:duration-200 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
              on
                ? "text-foreground after:scale-x-100 after:bg-brand after:opacity-100"
                : "text-muted-foreground after:scale-x-0 after:bg-brand after:opacity-0 hover:text-foreground",
            )}
            style={{ transformOrigin: "left" }}
          >
            <Icon
              weight={on ? "fill" : "regular"}
              className={cn(
                "size-3.5 transition-colors duration-150",
                on
                  ? "text-brand"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SettingsShell({
  slug,
  active,
  actions,
  children,
}: {
  slug: string;
  projectName: string;
  active: SettingsSection;
  /** @deprecated Page subheadings were removed for cross-tab consistency. */
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        contained
        title="Settings"
        actions={actions}
        toolbar={<SubTabs slug={slug} active={active} />}
      />
      {children}
    </div>
  );
}
