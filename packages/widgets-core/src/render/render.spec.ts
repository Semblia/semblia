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

describe("renderPublishedWidgetFragment", () => {
  it.each(["carousel", "grid", "masonry", "list", "wall"] as const)(
    "renders the %s preset",
    (preset) => {
      const definition = defaultWidgetDefinition({
        kind: preset === "wall" ? "wall" : "embed",
        layout: preset,
      });
      const doc = composePublishedWidgetDoc(
        definition,
        publishWidgetDefinition(definition),
      );
      const rendered = renderPublishedWidgetFragment(doc, {
        items: [item],
        widgetId: "wid_1",
      });

      expect(rendered.html).toContain(`sw-${preset}`);
      expect(rendered.html).toContain("Jane Doe");
      expect(rendered.html).toContain("--semblia-widget-accent");
    },
  );

  it("defaults to the classic variant and omits variant CSS", () => {
    const definition = defaultWidgetDefinition();
    const doc = composePublishedWidgetDoc(
      definition,
      publishWidgetDefinition(definition),
    );
    const rendered = renderPublishedWidgetFragment(doc, { items: [item] });

    expect(definition.layout.variant).toBe("classic");
    expect(rendered.html).toContain('data-sw-variant="classic"');
    expect(rendered.html).not.toContain("data-sw-variant=\"spotlight\"");
  });

  it("renders a named variant with its scoped CSS", () => {
    const definition = defaultWidgetDefinition({ layout: "carousel" });
    definition.layout.variant = "spotlight";
    const doc = composePublishedWidgetDoc(
      definition,
      publishWidgetDefinition(definition),
    );
    const rendered = renderPublishedWidgetFragment(doc, { items: [item] });

    expect(rendered.html).toContain('data-sw-variant="spotlight"');
    expect(rendered.html).toContain('[data-sw-variant="spotlight"]');
  });

  it("normalizes an unknown variant to classic", () => {
    const definition = defaultWidgetDefinition({ layout: "grid" });
    definition.layout.variant = "spotlight"; // not a grid variant
    const doc = composePublishedWidgetDoc(
      definition,
      publishWidgetDefinition(definition),
    );
    const rendered = renderPublishedWidgetFragment(doc, { items: [item] });

    expect(rendered.html).toContain('data-sw-variant="classic"');
  });

  it("escapes customer content", () => {
    const definition = defaultWidgetDefinition();
    const doc = composePublishedWidgetDoc(
      definition,
      publishWidgetDefinition(definition),
    );
    const rendered = renderPublishedWidgetFragment(doc, {
      items: [{ ...item, content: "<script>alert(1)</script>" }],
    });

    expect(rendered.html).not.toContain("<script>alert");
    expect(rendered.html).toContain("&lt;script&gt;");
  });
});
