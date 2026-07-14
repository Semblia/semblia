import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import type { PublicSnapshot } from "@workspace/forms-core";
import { FormRenderer } from "./renderer.js";
import type { RenderScheme, RenderSurface } from "./types.js";

export interface RenderToStringOptions {
  forcedScheme?: RenderScheme;
  forceClosed?: boolean;
  className?: string;
  surface?: RenderSurface;
}

/**
 * Server-render a snapshot to a hydratable HTML string for hosted pages and
 * embeds (forms_runtime). Pair with `mountForm(el, snapshot, { hydrate: true })`
 * on the client so the markup the user first sees is the markup that comes alive.
 */
export function renderFormToString(
  snapshot: PublicSnapshot,
  options: RenderToStringOptions = {},
): string {
  return renderToString(
    createElement(FormRenderer, { snapshot, mode: "live", ...options }),
  );
}

/**
 * Render to non-hydratable static markup — for static preview generation
 * (screenshot the markup) and OG/share images, where no interactivity follows.
 */
export function renderFormToStaticMarkup(
  snapshot: PublicSnapshot,
  options: RenderToStringOptions = {},
): string {
  return renderToStaticMarkup(
    createElement(FormRenderer, { snapshot, mode: "preview", ...options }),
  );
}
