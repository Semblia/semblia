"use client";

import * as React from "react";
import type { V2ImportCatalogSourceDTO, V2ImportMode } from "@workspace/types";
import { useDataState } from "@/components/shared";
import { useImportCatalog } from "@/hooks/api";

/**
 * The sources a method page may read from — the catalog scoped to one import
 * mode. Grouping by *capability* instead of the catalog's display group is
 * what lets the landing page stop enumerating sources: every source reaches
 * the user through the method that can actually read it.
 */
export function useMethodSources(slug: string, mode: V2ImportMode) {
  const catalogQuery = useImportCatalog({ slug });
  const sources = React.useMemo(
    () =>
      (catalogQuery.data ?? []).filter(
        (source) =>
          source.modes.includes(mode) && source.availability !== "BLOCKED",
      ),
    [catalogQuery.data, mode],
  );
  const state = useDataState(catalogQuery, { count: sources.length });
  return { catalogQuery, sources, state };
}

/**
 * The catalog source a pasted URL actually belongs to, when it isn't the one
 * the user chose. `null` while the URL is unparseable, unrecognized, or right.
 *
 * Detection used to silently retarget the import to whatever the host implied.
 * Once the source is chosen first, detection has a better job: noticing the
 * mismatch and offering the switch, because the link may be wrong or the source
 * may be, and only the person pasting knows which.
 */
export function useHostMismatch(
  sources: V2ImportCatalogSourceDTO[],
  sourceUrl: string,
  source: V2ImportCatalogSourceDTO,
): V2ImportCatalogSourceDTO | null {
  return React.useMemo(() => {
    const detected = matchSourceByUrl(sources, sourceUrl);
    return detected && detected.key !== source.key ? detected : null;
  }, [sources, sourceUrl, source.key]);
}

/** Host of a pasted URL, or null while it isn't parseable yet. */
export function urlHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    // Locale-independent: host comparison must not vary with the user's
    // locale (the Turkish-I casing hazard).
    return new URL(trimmed).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The catalog source whose public hosts match a pasted URL — the "paste a
 * link and we know where it's from" move. Exact hosts win over suffixes.
 */
export function matchSourceByUrl(
  sources: V2ImportCatalogSourceDTO[],
  raw: string,
): V2ImportCatalogSourceDTO | null {
  const host = urlHost(raw);
  if (!host) return null;
  for (const source of sources) {
    if (source.publicHosts.some((h) => h.toLowerCase() === host)) {
      return source;
    }
  }
  for (const source of sources) {
    if (
      source.publicHostSuffixes.some((suffix) => {
        const s = suffix.toLowerCase();
        // Dot-delimited only: a bare endsWith would let a look-alike host
        // (evilreddit.com) claim the reddit.com suffix.
        return host === s || host.endsWith(`.${s}`);
      })
    ) {
      return source;
    }
  }
  return null;
}
