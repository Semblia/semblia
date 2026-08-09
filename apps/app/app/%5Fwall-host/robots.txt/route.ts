import { projectWallHostname } from "@/lib/walls/host-routing";
import { resolveProjectWallHost } from "@/lib/walls/public-wall";
import { loadWallSeoEntries } from "@/lib/walls/wall-seo-loader";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

function textResponse(body: string, status = 200) {
  return new Response(body, { status, headers: RESPONSE_HEADERS });
}

function deniedRobots() {
  return "User-agent: *\nDisallow: /\n";
}

export async function GET(request: Request) {
  const hostname = projectWallHostname(request.headers.get("host"));
  if (!hostname) return textResponse("", 404);

  try {
    const resolution = await resolveProjectWallHost(hostname);
    if (!resolution) return textResponse("", 404);

    const primaries = resolution.walls.filter((wall) => wall.isPrimaryWall);
    if (primaries.length !== 1) return textResponse(deniedRobots());

    const entries = await loadWallSeoEntries(hostname, resolution.walls);
    if (!entries.some(({ payload }) => payload?.seo.indexable)) {
      return textResponse(deniedRobots());
    }

    const canonicalBase = resolution.canonicalUrl.replace(/\/$/, "");
    return textResponse(
      `User-agent: *\nAllow: /\nSitemap: ${canonicalBase}/sitemap.xml\n`,
    );
  } catch {
    return textResponse("", 503);
  }
}
