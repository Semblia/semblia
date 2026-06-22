/**
 * GET /api/site-metadata?url=<site>
 *
 * Server-side fetch of a project's website to pull the bits we can reuse:
 * favicon (→ project icon), title / og:site_name (→ name), description
 * (→ short description), and theme-color (→ brand colour). Runs server-side so
 * the browser never hits the third-party site directly and so we can apply
 * SSRF guards. Auth-gated: only signed-in users can trigger an outbound fetch,
 * which keeps this from being used as an open proxy.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { faviconForUrl, hostnameFromUrl } from "@/lib/favicon";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 512 * 1024; // 512 KB of HTML is plenty for <head>

/** Reject hosts that could let this endpoint reach internal infrastructure. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local"))
    return true;
  if (h === "metadata.google.internal") return true;
  // IPv6 loopback / link-local
  if (
    h === "::1" ||
    h.startsWith("fe80") ||
    h.startsWith("fc") ||
    h.startsWith("fd")
  )
    return true;
  // IPv4 literals in private / loopback / link-local ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  return m ? (m[2] ?? m[3] ?? "").trim() : null;
}

function metaContent(
  html: string,
  key: string,
  kind: "name" | "property",
): string | null {
  const re = new RegExp(`<meta[^>]*${kind}\\s*=\\s*["']${key}["'][^>]*>`, "i");
  const m = html.match(re);
  return m ? attr(m[0], "content") : null;
}

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Pick the best declared icon (apple-touch-icon preferred), else null. */
function parseIcon(html: string, pageUrl: string): string | null {
  const links = html.match(/<link[^>]+>/gi) ?? [];
  let icon: string | null = null;
  let apple: string | null = null;
  for (const tag of links) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (!href) continue;
    if (rel.includes("apple-touch-icon")) apple ??= resolveUrl(pageUrl, href);
    else if (rel.includes("icon")) icon ??= resolveUrl(pageUrl, href);
  }
  return apple ?? icon;
}

const HEX = /^#?[0-9a-fA-F]{6}$/;
function normalizeHex(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!HEX.test(v)) return null;
  return v.startsWith("#") ? v : `#${v}`;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url");
  const host = hostnameFromUrl(url);
  if (!url || !host) {
    return NextResponse.json(
      { error: "A valid url is required." },
      { status: 400 },
    );
  }
  if (isBlockedHost(host)) {
    return NextResponse.json(
      { error: "That host isn't allowed." },
      { status: 422 },
    );
  }

  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "SembliaBot/1.0 (+metadata-preview)",
        accept: "text/html",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Site responded ${res.status}.`,
          favicon: faviconForUrl(target),
        },
        { status: 200 },
      );
    }
    // Read at most MAX_BYTES of the body.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (received >= MAX_BYTES || /<\/head>/i.test(html)) {
          await reader.cancel().catch(() => {});
          break;
        }
      }
    } else {
      html = (await res.text()).slice(0, MAX_BYTES);
    }

    const titleTag =
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
    const siteName = metaContent(html, "og:site_name", "property");
    const ogTitle = metaContent(html, "og:title", "property");
    const description =
      metaContent(html, "description", "name") ??
      metaContent(html, "og:description", "property");
    const themeColor = normalizeHex(metaContent(html, "theme-color", "name"));
    const ogImage = metaContent(html, "og:image", "property");
    const favicon = parseIcon(html, res.url || target) ?? faviconForUrl(target);

    return NextResponse.json(
      {
        url: target,
        host,
        siteName: siteName ?? ogTitle ?? titleTag,
        title: ogTitle ?? titleTag,
        description: description?.slice(0, 280) ?? null,
        themeColor,
        favicon,
        ogImage: ogImage ? resolveUrl(res.url || target, ogImage) : null,
      },
      { status: 200 },
    );
  } catch {
    // Network/timeout — still hand back a derived favicon so the icon works.
    return NextResponse.json(
      {
        url: target,
        host,
        favicon: faviconForUrl(target),
        siteName: null,
        description: null,
        themeColor: null,
      },
      { status: 200 },
    );
  } finally {
    clearTimeout(timer);
  }
}
