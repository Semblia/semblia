import {
  UserCircleIcon,
  ShieldCheckIcon,
  BellIcon,
  CreditCardIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

// ── Account navigation model ─────────────────────────────────────────────────
//
// Single source of truth for the account area. Consumed by both the account
// sidebar (`account-sidebar.tsx`) and the avatar dropdown (`user-menu.tsx`) so
// the two can never list a different set of destinations.

export interface AccountNavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  /** One-line description, surfaced in the avatar dropdown. */
  description: string;
  disabled?: boolean;
}

export const ACCOUNT_NAV: AccountNavItem[] = [
  {
    label: "Profile",
    href: "/account/profile",
    icon: UserCircleIcon,
    description: "Name, email, and connected accounts",
  },
  {
    label: "Security",
    href: "/account/security",
    icon: ShieldCheckIcon,
    description: "Password and two-factor",
  },
  {
    label: "Notifications",
    href: "/account/notifications",
    icon: BellIcon,
    description: "Email alerts and digests",
  },
  {
    label: "Billing",
    href: "/account/billing",
    icon: CreditCardIcon,
    description: "Plan, usage, and invoices",
  },
];
