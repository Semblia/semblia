import {
  CONNECTED_IMPORT_POLICIES,
  isConnectedImportSourceKey,
} from "./connected-import-policy.js";

export type ImportAvailability =
  | "AVAILABLE"
  | "SETUP_REQUIRED"
  | "MANUAL_ONLY"
  | "BLOCKED";
export type ImportMode =
  | "SPREADSHEET"
  | "MANUAL"
  | "PUBLIC_URL"
  | "CONNECTED_API"
  | "MIGRATION";
export type ImportCatalogSource = Readonly<{
  key: string;
  label: string;
  group: string;
  modes: readonly ImportMode[];
  availability: ImportAvailability;
  reasonCode: string | null;
  reason: string | null;
  publicHosts: readonly string[];
  publicHostSuffixes: readonly string[];
  oauthStrategy: string | null;
  requiredScopes: readonly string[];
}>;
const source = (
  key: string,
  label: string,
  group: string,
  modes: readonly ImportMode[],
  publicHosts: readonly string[] = [],
  availability: ImportAvailability = "AVAILABLE",
  reasonCode: string | null = null,
  reason: string | null = null,
  publicHostSuffixes: readonly string[] = [],
): ImportCatalogSource => {
  const oauth = isConnectedImportSourceKey(key)
    ? CONNECTED_IMPORT_POLICIES[key]
    : null;
  return {
    key,
    label,
    group,
    modes,
    availability,
    reasonCode,
    reason,
    publicHosts: withConventionalAliases(publicHosts),
    publicHostSuffixes,
    oauthStrategy: oauth?.oauthStrategy ?? null,
    requiredScopes: oauth?.requiredScopes ?? [],
  };
};
function withConventionalAliases(hosts: readonly string[]) {
  return [
    ...new Set(
      hosts.flatMap((host) =>
        host.split(".").length === 2 && !host.startsWith("www.")
          ? [host, `www.${host}`]
          : [host],
      ),
    ),
  ];
}
const migration = (key: string, label: string, hosts: readonly string[]) =>
  source(key, label, "Wall migrations", ["MIGRATION", "SPREADSHEET"], hosts);
const bestEffortMigration = (
  key: string,
  label: string,
  hosts: readonly string[],
) =>
  source(
    key,
    label,
    "Wall migrations",
    ["MIGRATION", "SPREADSHEET"],
    hosts,
    "AVAILABLE",
    "DOCUMENTED_PUBLIC_PAGE_ONLY",
    "Use a documented public wall or embed URL. If its public shape is unsupported, upload the provider export instead.",
  );
const manualSource = (
  key: string,
  label: string,
  group: string,
  reason = "Use manual entry or a provider export; automated retrieval is not approved.",
  reasonCode = "PUBLIC_AUTOMATION_NOT_APPROVED",
) =>
  source(
    key,
    label,
    group,
    ["MANUAL", "SPREADSHEET"],
    [],
    "MANUAL_ONLY",
    reasonCode,
    reason,
  );
const manual = (key: string, label: string) =>
  manualSource(key, label, "Manual-only/private");
export const IMPORT_SOURCE_CATALOG: readonly ImportCatalogSource[] =
  Object.freeze(
    [
      source("spreadsheet", "CSV, XLS, XLSX", "Files", ["SPREADSHEET"]),
      source("manual", "Manual text proof", "Direct", ["MANUAL"]),
      source(
        "x",
        "X",
        "Connected social",
        ["CONNECTED_API", "MANUAL", "SPREADSHEET"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "linkedin",
        "LinkedIn",
        "Connected social",
        ["CONNECTED_API", "MANUAL", "SPREADSHEET"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "google-business",
        "Google Business Profile",
        "Connected reviews",
        ["CONNECTED_API", "MANUAL", "SPREADSHEET"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "youtube",
        "YouTube comments",
        "Connected reviews",
        ["CONNECTED_API", "MANUAL", "SPREADSHEET"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "product-hunt",
        "Product Hunt",
        "Public social/community",
        ["MANUAL", "SPREADSHEET"],
        [],
        "MANUAL_ONLY",
        "PUBLIC_AUTOMATION_NOT_APPROVED",
        "Product Hunt requires API permission for commercial use. Import proof manually or from an approved export.",
      ),
      manualSource(
        "reddit",
        "Reddit",
        "Public social/community",
        "Reddit commercial API access requires a separate agreement. Use manual entry or an approved export.",
      ),
      source(
        "vimeo",
        "Vimeo",
        "Public social/community",
        ["PUBLIC_URL", "MANUAL", "SPREADSHEET"],
        ["vimeo.com", "player.vimeo.com"],
        "SETUP_REQUIRED",
        "SERVER_PROVIDER_CREDENTIAL_REQUIRED",
        "A server-side Vimeo API credential is required to import public video comments.",
      ),
      manualSource("capterra", "Capterra", "Public reviews"),
      manualSource(
        "g2",
        "G2",
        "Public reviews",
        "G2 review retrieval requires a licensed syndication partnership. Use manual entry or a provider export.",
        "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
      ),
      manualSource(
        "apple-app-store",
        "Apple App Store",
        "Public reviews",
        "App Store review access requires an App Store Connect organization key. Use an App Store export until that account is connected.",
        "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
      ),
      source(
        "google-play",
        "Google Play reviews",
        "Connected reviews",
        ["CONNECTED_API", "MANUAL", "SPREADSHEET"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      manualSource(
        "trustpilot",
        "Trustpilot",
        "Public reviews",
        "Trustpilot API storage requires licensed access and deletion reconciliation at least every 28 days. Use a permitted export until that lifecycle is connected.",
        "OFFICIAL_PROVIDER_LIFECYCLE_REQUIRED",
      ),
      manualSource(
        "shopify",
        "Shopify",
        "Public reviews",
        "Shopify review access requires an approved merchant app and review-program scopes. Use a merchant export until connected.",
        "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
      ),
      manualSource(
        "yelp",
        "Yelp",
        "Public reviews",
        "Yelp does not permit durable review storage through its public API. Import only proof you separately have permission to use.",
      ),
      manualSource("apple-podcasts", "Apple Podcasts", "Public reviews"),
      manualSource("appsumo", "AppSumo", "Public reviews"),
      manualSource("zillow", "Zillow", "Public reviews"),
      manualSource(
        "udemy",
        "Udemy",
        "Public reviews",
        "Udemy review access requires an instructor token for owned courses. Use the official review CSV export until connected.",
        "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
      ),
      manualSource("chrome-web-store", "Chrome Web Store", "Public reviews"),
      manualSource("skillshare", "Skillshare", "Public reviews"),
      manualSource("realtor", "Realtor.com", "Public reviews"),
      manualSource("sourceforge", "SourceForge", "Public reviews"),
      manualSource(
        "whop",
        "Whop",
        "Public reviews",
        "Whop review access requires a company key or user OAuth connection. Use a provider export until connected.",
        "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
      ),
      source(
        "wordpress",
        "WordPress.com comments",
        "Public reviews",
        ["PUBLIC_URL", "MANUAL", "SPREADSHEET"],
        ["wordpress.com"],
        "AVAILABLE",
        "DOCUMENTED_PUBLIC_REST_ONLY",
        "Use a documented public WordPress.com comments endpoint. Self-hosted WordPress and WooCommerce sites require an export until ownership verification is available.",
        ["wordpress.com"],
      ),
      manualSource("fiverr", "Fiverr", "Public reviews"),
      manualSource("homestars", "HomeStars", "Public reviews"),
      manualSource("goodreads", "Goodreads", "Public reviews"),
      manualSource(
        "web-page",
        "Any website",
        "Public social/community",
        "Use the page URL while adding proof manually or upload a permitted export; unrestricted server-side scraping is not approved.",
      ),
      migration("testimonial-to", "Testimonial.to", [
        "testimonial.to",
        "embed-v2.testimonial.to",
      ]),
      migration("senja", "Senja", [
        "senja.io",
        "love.senja.io",
        "widget.senja.io",
      ]),
      migration("famewall", "Famewall", [
        "famewall.io",
        "wall.famewall.io",
        "embed.famewall.io",
        "wallembed.famewall.io",
      ]),
      bestEffortMigration("endorsal", "Endorsal", ["endorsal.io"]),
      bestEffortMigration("trustmary", "Trustmary", [
        "trustmary.com",
        "widget.trustmary.com",
      ]),
      manualSource(
        "trust",
        "Trust",
        "Wall migrations",
        "Trust migration requires an authenticated workspace API key. Upload its export until a project credential is connected.",
        "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
      ),
      bestEffortMigration("shoutout", "Shoutout", ["shoutout.social"]),
      bestEffortMigration("feedspace", "Feedspace", [
        "feedspace.io",
        "app.feedspace.io",
        "love.feedspace.io",
      ]),
      bestEffortMigration("boast", "Boast", [
        "boast.io",
        "app.boast.io",
        "widgets.boast.io",
        "api.boast.io",
      ]),
      bestEffortMigration("vocal-video", "Vocal Video", ["vocalvideo.com"]),
      bestEffortMigration("wiserreview", "WiserReview", [
        "wiserreview.com",
        "embed.wiserreview.com",
      ]),
      bestEffortMigration("shapo", "Shapo", ["shapo.io", "app.shapo.io"]),
      bestEffortMigration("walls-io", "Walls.io", [
        "walls.io",
        "my.walls.io",
      ]),
      bestEffortMigration("taggbox", "Taggbox", [
        "taggbox.com",
        "app.taggbox.com",
        "web.taggbox.com",
        "socialwalls.com",
        "app.socialwalls.com",
      ]),
      bestEffortMigration("embedsocial", "EmbedSocial", ["embedsocial.com"]),
      manual("facebook", "Facebook"),
      manual("instagram", "Instagram"),
      manual("pinterest", "Pinterest"),
      manual("tiktok", "TikTok"),
      manual("threads", "Threads"),
      manual("slack", "Slack"),
      manual("discord", "Discord"),
      manual("telegram", "Telegram"),
      manual("whatsapp", "WhatsApp"),
      manual("amazon", "Amazon"),
      manual("airbnb", "Airbnb"),
    ].map((entry) =>
      Object.freeze({
        ...entry,
        modes: Object.freeze([...entry.modes]),
        publicHosts: Object.freeze([...entry.publicHosts]),
        publicHostSuffixes: Object.freeze([...entry.publicHostSuffixes]),
        requiredScopes: Object.freeze([...entry.requiredScopes]),
      }),
    ),
  );
export function getImportSource(sourceKey: string) {
  return IMPORT_SOURCE_CATALOG.find((entry) => entry.key === sourceKey) ?? null;
}
