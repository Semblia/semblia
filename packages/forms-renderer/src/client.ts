import { createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import type { PublicSnapshot } from "@workspace/forms-core";
import { FormRenderer } from "./renderer.js";
import type { FormSubmitPayload, RenderScheme } from "./types.js";

export interface MountOptions {
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>;
  forcedScheme?: RenderScheme;
  /** Hydrate server-rendered markup instead of creating a fresh root. */
  hydrate?: boolean;
}

/**
 * Mount the renderer into a host element (native injection / embed loader).
 * Returns an unmount function. When `hydrate` is set, attaches to existing
 * server-rendered markup (`renderFormToString`).
 */
export function mountForm(
  el: HTMLElement,
  snapshot: PublicSnapshot,
  options: MountOptions = {},
): () => void {
  const element = createElement(FormRenderer, {
    snapshot,
    mode: "live",
    onSubmit: options.onSubmit,
    forcedScheme: options.forcedScheme,
  });
  if (options.hydrate) {
    const root = hydrateRoot(el, element);
    return () => root.unmount();
  }
  const root = createRoot(el);
  root.render(element);
  return () => root.unmount();
}
