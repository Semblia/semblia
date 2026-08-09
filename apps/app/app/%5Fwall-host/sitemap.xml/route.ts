import { projectWallHostname } from "@/lib/walls/host-routing";
import {
  resolveProjectWallHost,
  type PublicWallPayload,
} from "@/lib/walls/public-wall";
import { loadWallSeoEntries } from "@/lib/walls/wall-seo-loader";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/xml; charset=utf-8",
};

function xmlResponse(body: string, status = 200) {
  return new Response(body, { status, headers: RESPONSE_HEADERS });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function emptySitemap() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
}

function canonicalWallUrl(
  canonicalBase: string,
  wall: { wallSlug: string; isPrimaryWall: boolean },
  payload: PublicWallPayload | null,
): string | null {
  if (!payload?.seo.indexable) return null;
  try {
    const base = new URL(canonicalBase);
    const candidate = new URL(payload.seo.canonicalUrl);
    const expectedPath = wall.isPrimaryWall
      ? "/"
      : `/w/${encodeURIComponent(wall.wallSlug)}`;
    if (
      candidate.protocol !== "https:" ||
      candidate.origin !== base.origin ||
      candidate.pathname !== expectedPath ||
      candidate.username ||
      candidate.password ||
      candidate.search ||
      candidate.hash
    ) {
      return null;
    }
    return payload.seo.canonicalUrl;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const hostname = projectWallHostname(request.headers.get("host"));
  if (!hostname) return xmlResponse("", 404);

  try {
    const resolution = await resolveProjectWallHost(hostname);
    if (!resolution) return xmlResponse("", 404);

    const primaries = resolution.walls.filter((wall) => wall.isPrimaryWall);
    if (primaries.length !== 1) return xmlResponse(emptySitemap());

    const entries = await loadWallSeoEntries(hostname, resolution.walls);
    const urls = entries.flatMap(({ wall, payload }) => {
      const url = canonicalWallUrl(resolution.canonicalUrl, wall, payload);
      return url ? [url] : [];
    });
    const xmlEntries = urls
      .map((url) => `<url><loc>${escapeXml(url)}</loc></url>`)
      .join("");
    return xmlResponse(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlEntries}</urlset>\n`,
    );
  } catch {
    return xmlResponse("", 503);
  }
}
