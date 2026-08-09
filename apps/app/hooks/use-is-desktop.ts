"use client";

import { useMediaQuery } from "./use-media-query";

/** Returns `true` when viewport is ≥ 1024px (Tailwind `lg` breakpoint). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
