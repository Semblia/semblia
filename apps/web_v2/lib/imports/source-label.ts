const SOURCE_LABELS: Readonly<Record<string, string>> = {
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube comments",
  "google-business": "Google Business Profile",
  "product-hunt": "Product Hunt",
  g2: "G2",
  "apple-app-store": "Apple App Store",
  "google-play": "Google Play",
  appsumo: "AppSumo",
  "chrome-web-store": "Chrome Web Store",
  realtor: "Realtor.com",
  sourceforge: "SourceForge",
  wordpress: "WordPress",
  homestars: "HomeStars",
  "testimonial-to": "Testimonial.to",
  "vocal-video": "Vocal Video",
  wiserreview: "WiserReview",
  "walls-io": "Walls.io",
  embedsocial: "EmbedSocial",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  airbnb: "Airbnb",
};

export function formatImportSourceLabel(source: string | null | undefined) {
  const key = source?.trim().toLocaleLowerCase();
  if (!key) return "Imported proof";

  const knownLabel = SOURCE_LABELS[key];
  if (knownLabel) return knownLabel;

  return key
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");
}
