// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  FORM_EMBED_SRC,
  WIDGET_EMBED_SRC,
  ensureEmbedScript,
  ensureFormEmbed,
  ensureWidgetEmbed,
} from "./index.js";

function scripts(src: string) {
  return document.querySelectorAll(`script[src="${src}"]`);
}

afterEach(() => {
  document.head.innerHTML = "";
});

describe("ensureEmbedScript", () => {
  it("injects one async script and dedupes repeat calls", () => {
    ensureEmbedScript("https://example.com/e.js");
    ensureEmbedScript("https://example.com/e.js");

    const found = scripts("https://example.com/e.js");
    expect(found.length).toBe(1);
    expect((found[0] as HTMLScriptElement).async).toBe(true);
  });

  it("treats a hand-pasted snippet script as already loaded", () => {
    const pasted = document.createElement("script");
    pasted.src = WIDGET_EMBED_SRC;
    document.head.appendChild(pasted);

    ensureWidgetEmbed();

    expect(scripts(WIDGET_EMBED_SRC).length).toBe(1);
  });
});

describe("runtime-specific loaders", () => {
  it("loads the widget runtime as a module, matching the snippet", () => {
    ensureWidgetEmbed();

    const script = scripts(WIDGET_EMBED_SRC)[0] as HTMLScriptElement;
    expect(script.type).toBe("module");
  });

  it("loads the form runtime as a classic script, matching the snippet", () => {
    ensureFormEmbed();

    const script = scripts(FORM_EMBED_SRC)[0] as HTMLScriptElement;
    expect(script.type).toBe("");
  });
});
