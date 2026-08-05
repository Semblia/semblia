/**
 * Root URL segments the dashboard owns. Project slugs live at the URL root
 * (`app.semblia.com/<slug>/…`), so a slug equal to any of these would shadow
 * an app route. The API rejects them at project create AND slug update;
 * `web_v2` uses the same set to tell "project context" from app pages when
 * parsing a pathname. One list, two enforcers — do not fork it.
 */
export const RESERVED_PROJECT_SLUGS: ReadonlySet<string> = new Set([
  // Current root segments of the dashboard.
  "account",
  "new",
  "welcome",
  "wall",
  "legal",
  "design",
  "sign-in",
  "sign-up",
  "forgot-password",
  "sso-callback",
  "api",
  "continue", // post-sign-in resolver — sends you to your last-used project
  "projects", // legacy prefix — permanently redirected, never a project
  // Plausible future root segments — cheaper to reserve now than to migrate.
  "settings",
  "billing",
  "dashboard",
  "home",
  "docs",
  "help",
  "support",
  "admin",
  "login",
  "logout",
  "invite",
  "onboarding",
]);

export function isReservedProjectSlug(value: string): boolean {
  return RESERVED_PROJECT_SLUGS.has(value);
}
