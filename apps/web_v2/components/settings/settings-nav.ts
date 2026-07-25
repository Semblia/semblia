import {
  IdentificationCardIcon,
  PaintBrushIcon,
  EyeIcon,
  ShareNetworkIcon,
  GlobeIcon,
  ShieldCheckIcon,
  UsersIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { SectionNavItem } from "@/components/shared";
import {
  settingsPath,
  settingsBrandingPath,
  settingsVisibilityPath,
  settingsSocialPath,
  settingsDomainsPath,
  settingsSecurityPath,
  settingsMembersPath,
  settingsDangerPath,
} from "@/lib/routes";

// ── Settings section model ───────────────────────────────────────────────────
//
// Single source of truth for the project Settings sub-navigation. The id of
// each item doubles as the `SettingsSection` discriminator passed by pages.

export type SettingsSection =
  | "general"
  | "branding"
  | "visibility"
  | "social"
  | "domains"
  | "security"
  | "members"
  | "danger";

export function buildSettingsNav(slug: string): SectionNavItem[] {
  return [
    {
      id: "general",
      label: "General",
      href: settingsPath(slug),
      icon: IdentificationCardIcon,
    },
    {
      id: "branding",
      label: "Branding",
      href: settingsBrandingPath(slug),
      icon: PaintBrushIcon,
    },
    {
      id: "visibility",
      label: "Visibility",
      href: settingsVisibilityPath(slug),
      icon: EyeIcon,
    },
    {
      id: "social",
      label: "Social",
      href: settingsSocialPath(slug),
      icon: ShareNetworkIcon,
    },
    {
      id: "domains",
      label: "Domains",
      href: settingsDomainsPath(slug),
      icon: GlobeIcon,
    },
    {
      id: "security",
      label: "Security",
      href: settingsSecurityPath(slug),
      icon: ShieldCheckIcon,
    },
    {
      id: "members",
      label: "Members",
      href: settingsMembersPath(slug),
      icon: UsersIcon,
    },
    {
      id: "danger",
      label: "Danger",
      href: settingsDangerPath(slug),
      icon: WarningIcon,
      dividerBefore: true,
    },
  ];
}
