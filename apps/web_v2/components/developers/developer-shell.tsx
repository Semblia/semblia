"use client";

/**
 * DeveloperShell — shared page chrome for the project Developers area.
 *
 * Sub-tabs: Overview / Keys / Agents. Docs lives on docs.semblia.com, so the
 * Docs entry is rendered as an external link with an out-arrow indicator.
 * Detail pages render their own PageHeader and skip this shell.
 */

import * as React from "react";
import Link from "next/link";
import {
  HouseIcon,
  KeyIcon,
  RobotIcon,
  WebhooksLogoIcon,
  ExportIcon,
  PlugsConnectedIcon,
  ClockCounterClockwiseIcon,
  BookOpenTextIcon,
  ArrowSquareOutIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared";

export type DeveloperSection =
  | "overview"
  | "keys"
  | "agents"
  | "webhooks"
  | "exports"
  | "integrations"
  | "audit";

const EXTERNAL_DOCS_URL = "https://docs.semblia.com";

interface InternalTabSpec {
  kind: "internal";
  id: DeveloperSection;
  label: string;
  href: (slug: string) => string;
  icon: PhosphorIcon;
}

interface ExternalTabSpec {
  kind: "external";
  id: "docs";
  label: string;
  href: string;
  icon: PhosphorIcon;
}

type SubTabSpec = InternalTabSpec | ExternalTabSpec;

const SUB_TABS: SubTabSpec[] = [
  {
    kind: "internal",
    id: "overview",
    label: "Overview",
    href: (slug) => `/projects/${slug}/developers`,
    icon: HouseIcon,
  },
  {
    kind: "internal",
    id: "keys",
    label: "Keys",
    href: (slug) => `/projects/${slug}/developers/keys`,
    icon: KeyIcon,
  },
  {
    kind: "internal",
    id: "agents",
    label: "Agents",
    href: (slug) => `/projects/${slug}/developers/agents`,
    icon: RobotIcon,
  },
  {
    kind: "internal",
    id: "webhooks",
    label: "Webhooks",
    href: (slug) => `/projects/${slug}/developers/webhooks`,
    icon: WebhooksLogoIcon,
  },
  {
    kind: "internal",
    id: "exports",
    label: "Exports",
    href: (slug) => `/projects/${slug}/developers/exports`,
    icon: ExportIcon,
  },
  {
    kind: "internal",
    id: "integrations",
    label: "Integrations",
    href: (slug) => `/projects/${slug}/developers/integrations`,
    icon: PlugsConnectedIcon,
  },
  {
    kind: "internal",
    id: "audit",
    label: "Activity",
    href: (slug) => `/projects/${slug}/developers/audit`,
    icon: ClockCounterClockwiseIcon,
  },
  {
    kind: "external",
    id: "docs",
    label: "Docs",
    href: EXTERNAL_DOCS_URL,
    icon: BookOpenTextIcon,
  },
];

function SubTabs({ slug, active }: { slug: string; active: DeveloperSection }) {
  return (
    <div
      role="tablist"
      aria-label="Developer sections"
      className="scrollbar-none -my-2.5 flex min-w-0 items-center gap-0 overflow-x-auto"
    >
      {SUB_TABS.map((tab) => {
        const on = tab.kind === "internal" && tab.id === active;
        const Icon = tab.icon;

        const baseCls = cn(
          "group relative inline-flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-medium",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand",
          "after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-full after:rounded-full",
          "after:transition-[transform,opacity] after:duration-200 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          on
            ? "text-foreground after:scale-x-100 after:bg-brand after:opacity-100"
            : "text-muted-foreground after:scale-x-0 after:bg-brand after:opacity-0 hover:text-foreground",
        );
        const iconCls = cn(
          "size-3.5 transition-colors duration-150",
          on
            ? "text-brand"
            : "text-muted-foreground group-hover:text-foreground",
        );

        if (tab.kind === "external") {
          return (
            <a
              key={tab.id}
              href={tab.href}
              target="_blank"
              rel="noreferrer noopener"
              role="tab"
              aria-selected={false}
              className={baseCls}
              style={{ transformOrigin: "left" }}
            >
              <Icon weight="regular" className={iconCls} />
              {tab.label}
              <ArrowSquareOutIcon
                className="size-3 text-muted-foreground/70"
                aria-hidden
              />
            </a>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href(slug)}
            role="tab"
            aria-selected={on}
            className={baseCls}
            style={{ transformOrigin: "left" }}
          >
            <Icon weight={on ? "fill" : "regular"} className={iconCls} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function DeveloperShell({
  slug,
  active,
  actions,
  children,
}: {
  slug: string;
  active: DeveloperSection;
  /** @deprecated Page subheadings were removed for cross-tab consistency. */
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Developers"
        actions={actions}
        toolbar={<SubTabs slug={slug} active={active} />}
      />
      {children}
    </div>
  );
}
