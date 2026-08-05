/**
 * Dashboard links the API writes into notifications and emails.
 *
 * The web app's own builders live in `apps/web_v2/lib/routes.ts` under a rule
 * of "never hand-build an internal href". Notifications are the one place the
 * API has to name a dashboard address, so the same rule applies here: the
 * vocabulary lives in one module, and a route rename has one place to land on
 * this side of the wire.
 *
 * Only paths, never absolute URLs — `EmailDeliveryService.toAppUrl` is what
 * turns a path into a link for a mail client, and a stored notification is
 * rendered by the app itself.
 */

const enc = encodeURIComponent;

export const appProjectPath = (slug: string) => `/${enc(slug)}`;

export const appResponsesPath = (slug: string) =>
  `${appProjectPath(slug)}/responses`;
export const appResponsePath = (slug: string, responseId: string) =>
  `${appResponsesPath(slug)}/${enc(responseId)}`;

const appDevelopersPath = (slug: string) =>
  `${appProjectPath(slug)}/developers`;

export const appDeveloperKeyPath = (slug: string, keyId: string) =>
  `${appDevelopersPath(slug)}/keys/${enc(keyId)}`;
export const appAgentKeyPath = (slug: string, keyId: string) =>
  `${appDevelopersPath(slug)}/agents/${enc(keyId)}`;
export const appWebhooksPath = (slug: string) =>
  `${appDevelopersPath(slug)}/webhooks`;
export const appExportsPath = (slug: string) =>
  `${appDevelopersPath(slug)}/exports`;

const appSettingsPath = (slug: string) => `${appProjectPath(slug)}/settings`;

export const appSettingsSecurityPath = (slug: string) =>
  `${appSettingsPath(slug)}/security`;
export const appSettingsMembersPath = (slug: string) =>
  `${appSettingsPath(slug)}/members`;
export const appSettingsDangerPath = (slug: string) =>
  `${appSettingsPath(slug)}/danger`;

/**
 * An API credential's own page. Agent keys live under a separate section from
 * project keys, so the credential's type — not just its id — decides the
 * address; sending an agent key to the project-key route lands on a 404.
 */
export function appApiKeyPath(
  slug: string,
  keyId: string,
  keyType: string,
): string {
  return keyType === "AGENT"
    ? appAgentKeyPath(slug, keyId)
    : appDeveloperKeyPath(slug, keyId);
}
