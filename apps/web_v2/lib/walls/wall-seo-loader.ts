import type { V2PublicSurfaceWallResourceDTO } from "@workspace/types";
import { fetchProjectWall, type PublicWallPayload } from "./public-wall";

/** Maximum resolver-owned walls that robots or sitemap may inspect per request. */
export const MAX_WALL_SEO_ENTRIES = 100;

/** Protect the public API from a single SEO request fanning out without bound. */
export const WALL_SEO_FETCH_CONCURRENCY = 4;

export interface LoadedWallSeoEntry {
  wall: V2PublicSurfaceWallResourceDTO;
  payload: PublicWallPayload | null;
}

/**
 * Selects the unique primary first, then resolver-order additional walls, and
 * loads at most 100 entries in four-wide batches. Callers validate the unique
 * primary invariant before invoking this helper.
 */
export async function loadWallSeoEntries(
  hostname: string,
  walls: readonly V2PublicSurfaceWallResourceDTO[],
): Promise<LoadedWallSeoEntry[]> {
  const primary = walls.find((wall) => wall.isPrimaryWall);
  if (!primary) return [];

  const selected = [
    primary,
    ...walls
      .filter((wall) => !wall.isPrimaryWall)
      .slice(0, MAX_WALL_SEO_ENTRIES - 1),
  ];
  const loaded: LoadedWallSeoEntry[] = [];

  for (
    let offset = 0;
    offset < selected.length;
    offset += WALL_SEO_FETCH_CONCURRENCY
  ) {
    const batch = selected.slice(offset, offset + WALL_SEO_FETCH_CONCURRENCY);
    const payloads = await Promise.all(
      batch.map((wall) => fetchProjectWall(hostname, wall.wallSlug)),
    );
    loaded.push(
      ...batch.map((wall, index) => ({
        wall,
        payload: payloads[index] ?? null,
      })),
    );
  }

  return loaded;
}
