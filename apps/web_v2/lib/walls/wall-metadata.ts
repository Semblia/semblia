import type { Metadata } from "next";
import type { PublicWallPayload } from "./public-wall";

function wallDescription(payload: PublicWallPayload) {
  return (
    payload.widget.wall?.subhead ||
    `Customer stories${payload.project?.name ? ` about ${payload.project.name}` : ""}.`
  );
}

function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Metadata is deliberately driven by API-issued SEO data, never the request host. */
export function buildWallMetadata(payload: PublicWallPayload): Metadata {
  const wall = payload.widget.wall;
  if (!wall)
    return { title: "Wall not found", robots: { index: false, follow: false } };
  const title = payload.project?.name
    ? `${wall.title} — ${payload.project.name}`
    : wall.title;
  const description = wallDescription(payload);
  const canonical = payload.seo.canonicalUrl;
  return {
    title,
    description,
    alternates: { canonical },
    robots: payload.seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: payload.project?.name ?? "Semblia",
    },
    twitter: { card: "summary", title, description },
  };
}

/** JSON-LD is intentionally limited to claims this public payload can prove. */
export function buildWallJsonLd(payload: PublicWallPayload): string {
  const name = payload.project?.name ?? payload.widget.name;
  const websiteUrl = safeHttpUrl(payload.project?.websiteUrl);
  const nodes = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name,
      ...(websiteUrl ? { url: websiteUrl } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name,
      url: payload.seo.canonicalUrl,
    },
  ];
  return JSON.stringify(nodes).replace(/</g, "\\u003c");
}
