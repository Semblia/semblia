import {
  HouseIcon,
  KeyIcon,
  RobotIcon,
  WebhooksLogoIcon,
  ExportIcon,
  ClockCounterClockwiseIcon,
  BookOpenTextIcon,
} from "@phosphor-icons/react";
import type { SectionNavItem } from "@/components/shared";
import {
  activityPath,
  agentKeysPath,
  developerKeysPath,
  developersPath,
  exportsPath,
  webhooksPath,
} from "@/lib/routes";

// ── Developers section model ─────────────────────────────────────────────────
//
// Single source of truth for the project Developers sub-navigation. Docs lives
// on the external docs site, so it is rendered as an external link.
// Integrations is a top-level project section (`/[project]/integrations`),
// not a developer surface.

export type DeveloperSection =
  | "overview"
  | "keys"
  | "agents"
  | "webhooks"
  | "exports"
  | "activity";

const EXTERNAL_DOCS_URL = "https://docs.semblia.com";

export function buildDeveloperNav(slug: string): SectionNavItem[] {
  return [
    {
      id: "overview",
      label: "Overview",
      href: developersPath(slug),
      icon: HouseIcon,
    },
    {
      id: "keys",
      label: "Keys",
      href: developerKeysPath(slug),
      icon: KeyIcon,
    },
    {
      id: "agents",
      label: "Agents",
      href: agentKeysPath(slug),
      icon: RobotIcon,
    },
    {
      id: "webhooks",
      label: "Webhooks",
      href: webhooksPath(slug),
      icon: WebhooksLogoIcon,
    },
    {
      id: "exports",
      label: "Exports",
      href: exportsPath(slug),
      icon: ExportIcon,
    },
    {
      id: "activity",
      label: "Activity",
      href: activityPath(slug),
      icon: ClockCounterClockwiseIcon,
    },
    {
      id: "docs",
      label: "Docs",
      href: EXTERNAL_DOCS_URL,
      icon: BookOpenTextIcon,
      external: true,
    },
  ];
}
