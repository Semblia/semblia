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
): ImportCatalogSource => ({
  key,
  label,
  group,
  modes,
  availability,
  reasonCode,
  reason,
  publicHosts,
});
const publicSource = (key: string, label: string, hosts: readonly string[]) =>
  source(key, label, "Public reviews", ["PUBLIC_URL"], hosts);
const migration = (key: string, label: string, hosts: readonly string[]) =>
  source(key, label, "Wall migrations", ["MIGRATION", "SPREADSHEET"], hosts);
const manual = (key: string, label: string) =>
  source(
    key,
    label,
    "Manual-only/private",
    ["MANUAL", "SPREADSHEET"],
    [],
    "MANUAL_ONLY",
    "PUBLIC_AUTOMATION_NOT_APPROVED",
    "Use manual entry or a provider export; automated retrieval is not approved.",
  );
export const IMPORT_SOURCE_CATALOG: readonly ImportCatalogSource[] =
  Object.freeze(
    [
      source("spreadsheet", "CSV, XLS, XLSX", "Files", ["SPREADSHEET"]),
      source("manual", "Manual text proof", "Direct", ["MANUAL"]),
      source(
        "x",
        "X",
        "Connected social",
        ["CONNECTED_API"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "linkedin",
        "LinkedIn",
        "Connected social",
        ["CONNECTED_API"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "google-business",
        "Google Business Profile",
        "Connected reviews",
        ["CONNECTED_API"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "youtube",
        "YouTube comments",
        "Connected reviews",
        ["CONNECTED_API"],
        [],
        "SETUP_REQUIRED",
        "PROVIDER_SETUP_REQUIRED",
        "Provider OAuth setup and approved scopes are required.",
      ),
      source(
        "product-hunt",
        "Product Hunt",
        "Public social/community",
        ["PUBLIC_URL"],
        ["producthunt.com"],
      ),
      source(
        "reddit",
        "Reddit",
        "Public social/community",
        ["PUBLIC_URL"],
        ["reddit.com"],
      ),
      source(
        "vimeo",
        "Vimeo",
        "Public social/community",
        ["PUBLIC_URL"],
        ["vimeo.com"],
      ),
      publicSource("capterra", "Capterra", ["capterra.com"]),
      publicSource("g2", "G2", ["g2.com"]),
      publicSource("apple-app-store", "Apple App Store", ["apps.apple.com"]),
      publicSource("google-play", "Google Play", ["play.google.com"]),
      publicSource("trustpilot", "Trustpilot", ["trustpilot.com"]),
      publicSource("shopify", "Shopify", ["shopify.com", "myshopify.com"]),
      publicSource("yelp", "Yelp", ["yelp.com"]),
      publicSource("apple-podcasts", "Apple Podcasts", ["podcasts.apple.com"]),
      publicSource("appsumo", "AppSumo", ["appsumo.com"]),
      publicSource("zillow", "Zillow", ["zillow.com"]),
      publicSource("udemy", "Udemy", ["udemy.com"]),
      publicSource("chrome-web-store", "Chrome Web Store", [
        "chromewebstore.google.com",
      ]),
      publicSource("skillshare", "Skillshare", ["skillshare.com"]),
      publicSource("realtor", "Realtor.com", ["realtor.com"]),
      publicSource("sourceforge", "SourceForge", ["sourceforge.net"]),
      publicSource("whop", "Whop", ["whop.com"]),
      publicSource("wordpress", "WordPress", [
        "wordpress.com",
        "wordpress.org",
      ]),
      publicSource("fiverr", "Fiverr", ["fiverr.com"]),
      publicSource("homestars", "HomeStars", ["homestars.com"]),
      publicSource("goodreads", "Goodreads", ["goodreads.com"]),
      migration("testimonial-to", "Testimonial.to", [
        "testimonial.to",
        "embed-v2.testimonial.to",
      ]),
      migration("senja", "Senja", ["senja.io", "love.senja.io"]),
      migration("famewall", "Famewall", [
        "famewall.io",
        "wall.famewall.io",
        "embed.famewall.io",
        "wallembed.famewall.io",
      ]),
      migration("endorsal", "Endorsal", ["endorsal.io"]),
      migration("trustmary", "Trustmary", ["trustmary.com"]),
      migration("trust", "Trust", ["usetrust.io"]),
      migration("shoutout", "Shoutout", ["shoutout.social"]),
      migration("feedspace", "Feedspace", ["feedspace.io"]),
      migration("boast", "Boast", ["boast.io", "app.boast.io"]),
      migration("vocal-video", "Vocal Video", ["vocalvideo.com"]),
      migration("wiserreview", "WiserReview", ["wiserreview.com"]),
      migration("shapo", "Shapo", ["shapo.io"]),
      migration("walls-io", "Walls.io", ["walls.io"]),
      migration("taggbox", "Taggbox", ["taggbox.com"]),
      migration("embedsocial", "EmbedSocial", ["embedsocial.com"]),
      manual("facebook", "Facebook"),
      manual("instagram", "Instagram"),
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
      }),
    ),
  );
export function getImportSource(sourceKey: string) {
  return IMPORT_SOURCE_CATALOG.find((entry) => entry.key === sourceKey) ?? null;
}
