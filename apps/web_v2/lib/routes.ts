import { isReservedProjectSlug } from "@workspace/types";

/**
 * Canonical internal app routes — the sitemap as code.
 *
 * Projects are root-scoped (`/<project>/forms`, not `/projects/<slug>/forms`);
 * the API guarantees a project slug can never collide with an app segment
 * (see `RESERVED_PROJECT_SLUGS` in `@workspace/types`). Never hand-build an
 * internal href — add the builder here so the next restructure is one file.
 *
 * Public surface URLs (hosted forms, walls, embeds) live in
 * `lib/semblia-urls.ts`, not here.
 */

const enc = encodeURIComponent;

// ── Workspace ────────────────────────────────────────────────────────────────

/** Projects home — the app's front door. */
export const homePath = () => "/";
export const newProjectPath = () => "/new";

// ── Project sections ─────────────────────────────────────────────────────────

export const projectPath = (slug: string) => `/${enc(slug)}`;

export const formsPath = (slug: string) => `${projectPath(slug)}/forms`;
export const formStudioPath = (slug: string, formId: string) =>
  `${formsPath(slug)}/${enc(formId)}`;
export const formPreviewPath = (slug: string, formId: string) =>
  `${formStudioPath(slug, formId)}/preview`;

export const responsesPath = (slug: string) => `${projectPath(slug)}/responses`;
export const responsePath = (slug: string, responseId: string) =>
  `${responsesPath(slug)}/${enc(responseId)}`;

// Import is collection, not moderation — a top-level destination beside Forms.
// The old `/responses/import` address 308-redirects here (next.config.ts).
export const importPath = (slug: string) => `${projectPath(slug)}/import`;
export const importConnectPath = (slug: string) =>
  `${importPath(slug)}/connect`;
export const importWebPath = (slug: string) => `${importPath(slug)}/web`;
export const importSpreadsheetPath = (slug: string) =>
  `${importPath(slug)}/spreadsheet`;
export const importManualPath = (slug: string) => `${importPath(slug)}/manual`;
export const importMigratePath = (slug: string) =>
  `${importPath(slug)}/migrate`;

// The Social Proof Studio — route segment renamed widgets → studio 2026-08-01;
// next.config.ts carries permanent redirects from the old addresses.
export const widgetsPath = (slug: string) => `${projectPath(slug)}/studio`;
export const widgetStudioPath = (slug: string, widgetId: string) =>
  `${widgetsPath(slug)}/${enc(widgetId)}`;
export const widgetPreviewPath = (slug: string, widgetId: string) =>
  `${widgetStudioPath(slug, widgetId)}/preview`;

export const analyticsPath = (slug: string) => `${projectPath(slug)}/analytics`;

export const integrationsPath = (slug: string) =>
  `${projectPath(slug)}/integrations`;

// ── Developers ───────────────────────────────────────────────────────────────

export const developersPath = (slug: string) =>
  `${projectPath(slug)}/developers`;
export const developerKeysPath = (slug: string) =>
  `${developersPath(slug)}/keys`;
export const developerKeyNewPath = (slug: string) =>
  `${developerKeysPath(slug)}/new`;
export const developerKeyPath = (slug: string, keyId: string) =>
  `${developerKeysPath(slug)}/${enc(keyId)}`;
export const agentKeysPath = (slug: string) => `${developersPath(slug)}/agents`;
export const agentKeyNewPath = (slug: string) => `${agentKeysPath(slug)}/new`;
export const agentKeyPath = (slug: string, keyId: string) =>
  `${agentKeysPath(slug)}/${enc(keyId)}`;
export const webhooksPath = (slug: string) =>
  `${developersPath(slug)}/webhooks`;
export const webhookNewPath = (slug: string) => `${webhooksPath(slug)}/new`;
export const exportsPath = (slug: string) => `${developersPath(slug)}/exports`;
export const activityPath = (slug: string) =>
  `${developersPath(slug)}/activity`;

// ── Project settings ─────────────────────────────────────────────────────────

export const settingsPath = (slug: string) => `${projectPath(slug)}/settings`;
export const settingsBrandingPath = (slug: string) =>
  `${settingsPath(slug)}/branding`;
export const settingsVisibilityPath = (slug: string) =>
  `${settingsPath(slug)}/visibility`;
export const settingsSocialPath = (slug: string) =>
  `${settingsPath(slug)}/social`;
export const settingsDomainsPath = (slug: string) =>
  `${settingsPath(slug)}/domains`;
export const settingsSecurityPath = (slug: string) =>
  `${settingsPath(slug)}/security`;
export const settingsMembersPath = (slug: string) =>
  `${settingsPath(slug)}/members`;
export const settingsDangerPath = (slug: string) =>
  `${settingsPath(slug)}/danger`;

// ── Account ──────────────────────────────────────────────────────────────────

export const accountPath = () => "/account";
export const accountProfilePath = () => "/account/profile";
export const accountSecurityPath = () => "/account/security";
export const accountNotificationsPath = () => "/account/notifications";
export const accountBillingPath = () => "/account/billing";

// ── Standalone ───────────────────────────────────────────────────────────────

export const welcomePath = () => "/welcome";
export const signInPath = () => "/sign-in";
export const signUpPath = () => "/sign-up";
export const forgotPasswordPath = () => "/forgot-password";
export const ssoCallbackPath = () => "/sso-callback";
export const legalTermsPath = () => "/legal/terms";
export const legalPrivacyPath = () => "/legal/privacy";

// ── Pathname parsing ─────────────────────────────────────────────────────────

/**
 * Extracts the project slug from a pathname, or null when the path is an app
 * page (home, /new, /account, …) rather than a project context.
 */
export function projectSlugFromPathname(pathname: string): string | null {
  const [first] = pathname.replace(/^\/+/, "").split("/");
  if (!first) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(first);
  } catch {
    return null;
  }
  return isReservedProjectSlug(decoded) ? null : decoded;
}
