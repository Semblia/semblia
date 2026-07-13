import { describe, expect, it } from "vitest";
import {
  composePublishedWidgetDoc,
  defaultWidgetDefinition,
  publishWidgetDefinition,
} from "../schema/index.js";
import { renderPublishedWidgetFragment } from "./index.js";

const item = {
  id: "sub_1",
  authorName: "Jane Doe",
  authorRole: "Founder",
  authorCompany: "Acme",
  content: "Semblia turned our customer proof into a real growth loop.",
  rating: 5,
  source: "manual",
  createdAt: "2026-06-14T00:00:00.000Z",
};

function published(definition = defaultWidgetDefinition()) {
  return composePublishedWidgetDoc(
    definition,
    publishWidgetDefinition(definition),
  );
}

describe("renderPublishedWidgetFragment", () => {
  it.each(["marquee", "gallery", "mosaic", "column", "editorial"] as const)(
    "renders the %s template",
    (templateId) => {
      const definition = defaultWidgetDefinition({
        kind: templateId === "editorial" ? "wall" : "embed",
        templateId,
      });
      const rendered = renderPublishedWidgetFragment(published(definition), {
        items: [item],
        widgetId: "wid_1",
      });

      expect(rendered.html).toContain(`data-sw-template="${templateId}"`);
      expect(rendered.html).toContain("Jane Doe");
      expect(rendered.html).toContain("--semblia-widget-accent");
    },
  );

  it("stamps normalized accent decisions as data attributes", () => {
    const definition = defaultWidgetDefinition({ templateId: "marquee" });
    definition.accents = { mode: "spotlight", bogus: "x" };
    const rendered = renderPublishedWidgetFragment(published(definition), {
      items: [item],
    });

    expect(rendered.html).toContain('data-sw-a-mode="spotlight"');
    expect(rendered.html).not.toContain("data-sw-a-bogus");
    expect(rendered.html).toContain('[data-sw-a-mode="spotlight"]');
  });

  it("normalizes unknown accent values to the template default", () => {
    const definition = defaultWidgetDefinition({ templateId: "gallery" });
    definition.accents = { lead: "not-an-option" };
    const rendered = renderPublishedWidgetFragment(published(definition), {
      items: [item],
    });

    expect(rendered.html).toContain('data-sw-a-lead="uniform"');
  });

  it("falls back to Marquee for a retired template id", () => {
    const definition = defaultWidgetDefinition();
    definition.templateId = "retired-template";
    const rendered = renderPublishedWidgetFragment(published(definition), {
      items: [item],
    });

    expect(rendered.html).toContain('data-sw-template="marquee"');
  });

  it("escapes customer content", () => {
    const rendered = renderPublishedWidgetFragment(published(), {
      items: [{ ...item, content: "<script>alert(1)</script>" }],
    });

    expect(rendered.html).not.toContain("<script>alert");
    expect(rendered.html).toContain("&lt;script&gt;");
  });
});
