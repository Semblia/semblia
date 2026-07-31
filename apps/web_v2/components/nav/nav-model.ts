import {
  BellIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  ChatCircleTextIcon,
  ClipboardTextIcon,
  CodeIcon,
  CreditCardIcon,
  FoldersIcon,
  PlugsConnectedIcon,
  PlusIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import {
  accountBillingPath,
  accountNotificationsPath,
  accountProfilePath,
  accountSecurityPath,
  activityPath,
  agentKeysPath,
  analyticsPath,
  developerKeysPath,
  developersPath,
  exportsPath,
  formsPath,
  homePath,
  integrationsPath,
  newProjectPath,
  responsesImportPath,
  responsesPath,
  settingsBrandingPath,
  settingsDangerPath,
  settingsDomainsPath,
  settingsMembersPath,
  settingsPath,
  settingsSecurityPath,
  settingsSocialPath,
  settingsVisibilityPath,
  webhooksPath,
  widgetsPath,
} from "@/lib/routes";

/**
 * The app's navigation model — every internal destination, in one file.
 *
 * There is exactly ONE navigation surface in the app (the sidebar), so there
 * is exactly one model behind it. Sub-destinations are `children`: they are
 * revealed inline under their section while that section is active, which is
 * why the app no longer needs a second rail, a tab strip, or a breadcrumb.
 *
 * Two contexts exist, and they render identically:
 *   • workspace — no project in the URL (`/`, `/new`, `/account/*`)
 *   • project   — inside `/[project]/*`
 */

const EXTERNAL_DOCS_URL = "https://docs.semblia.com";

export interface NavChild {
  label: string;
  href: string;
  /** Rendered after a hairline, at the end of the group. */
  separated?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  /** One-line hint. Surfaced by the user menu, not by the sidebar. */
  description?: string;
  /** Revealed inline while this section is active. */
  children?: NavChild[];
  /** Match `href` exactly instead of by prefix (used by the `/` home item). */
  exact?: boolean;
  external?: boolean;
  disabled?: boolean;
}

export interface NavGroup {
  /** `null` renders a hairline instead of a heading. */
  label: string | null;
  items: NavItem[];
}

// ── Account ──────────────────────────────────────────────────────────────────

/** Also consumed by the avatar dropdown, so the two can never disagree. */
export const ACCOUNT_NAV: NavItem[] = [
  {
    label: "Profile",
    href: accountProfilePath(),
    icon: UserCircleIcon,
    description: "Name, email, and connected accounts",
  },
  {
    label: "Security",
    href: accountSecurityPath(),
    icon: ShieldCheckIcon,
    description: "Password and two-factor",
  },
  {
    label: "Notifications",
    href: accountNotificationsPath(),
    icon: BellIcon,
    description: "Email alerts and digests",
  },
  {
    label: "Billing",
    href: accountBillingPath(),
    icon: CreditCardIcon,
    description: "Plan, usage, and invoices",
  },
];

// ── Workspace context ────────────────────────────────────────────────────────

export function buildWorkspaceNav(): NavGroup[] {
  return [
    {
      label: null,
      items: [
        {
          label: "Projects",
          href: homePath(),
          icon: FoldersIcon,
          exact: true,
        },
        {
          label: "New project",
          href: newProjectPath(),
          icon: PlusIcon,
        },
      ],
    },
    { label: "Account", items: ACCOUNT_NAV },
  ];
}

// ── Project context ──────────────────────────────────────────────────────────

export function buildProjectNav(slug: string): NavGroup[] {
  return [
    {
      label: null,
      items: [
        { label: "Forms", href: formsPath(slug), icon: ClipboardTextIcon },
        {
          label: "Responses",
          href: responsesPath(slug),
          icon: ChatCircleTextIcon,
          children: [
            { label: "Queue", href: responsesPath(slug) },
            { label: "Import", href: responsesImportPath(slug) },
          ],
        },
        // The Social Proof Studio — walls of love and embedded widgets. The
        // sidebar carries the short name; the page header carries the full one.
        { label: "Studio", href: widgetsPath(slug), icon: SealCheckIcon },
        { label: "Analytics", href: analyticsPath(slug), icon: ChartBarIcon },
      ],
    },
    {
      label: null,
      items: [
        {
          label: "Integrations",
          href: integrationsPath(slug),
          icon: PlugsConnectedIcon,
        },
        {
          label: "Developers",
          href: developersPath(slug),
          icon: CodeIcon,
          children: [
            { label: "API keys", href: developerKeysPath(slug) },
            { label: "Agent keys", href: agentKeysPath(slug) },
            { label: "Webhooks", href: webhooksPath(slug) },
            { label: "Exports", href: exportsPath(slug) },
            { label: "Activity", href: activityPath(slug) },
          ],
        },
        {
          label: "Settings",
          href: settingsPath(slug),
          icon: SlidersHorizontalIcon,
          children: [
            { label: "General", href: settingsPath(slug) },
            { label: "Branding", href: settingsBrandingPath(slug) },
            { label: "Visibility", href: settingsVisibilityPath(slug) },
            { label: "Social", href: settingsSocialPath(slug) },
            { label: "Domains", href: settingsDomainsPath(slug) },
            { label: "Security", href: settingsSecurityPath(slug) },
            { label: "Members", href: settingsMembersPath(slug) },
            {
              label: "Delete project",
              href: settingsDangerPath(slug),
              separated: true,
            },
          ],
        },
      ],
    },
    {
      label: null,
      items: [
        {
          label: "Documentation",
          href: EXTERNAL_DOCS_URL,
          icon: BookOpenTextIcon,
          external: true,
        },
      ],
    },
  ];
}

// ── Active-state matching ────────────────────────────────────────────────────

export function isHrefActive(
  pathname: string,
  href: string,
  exact = false,
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The one selected child, by longest match.
 *
 * A section's own href doubles as its first child ("Settings" → "General"),
 * so a plain prefix test would light up General on every settings page.
 * Longest-match picks the most specific destination without every child
 * needing to declare how it should be compared.
 */
export function activeChildHref(
  pathname: string,
  children: NavChild[] | undefined,
): string | null {
  if (!children) return null;
  let best: string | null = null;
  for (const child of children) {
    if (!isHrefActive(pathname, child.href)) continue;
    if (best === null || child.href.length > best.length) best = child.href;
  }
  return best;
}

/** Label of the destination the pathname is on — used by the mobile bar. */
export function activeLabel(
  pathname: string,
  groups: NavGroup[],
): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.external) continue;
      if (!isHrefActive(pathname, item.href, item.exact)) continue;
      const href = activeChildHref(pathname, item.children);
      const child = item.children?.find((c) => c.href === href);
      return child ? `${item.label} · ${child.label}` : item.label;
    }
  }
  return null;
}
