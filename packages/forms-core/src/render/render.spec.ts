import { describe, expect, it } from "vitest";
import {
  defaultFormDefinition,
  publishFormDefinition,
} from "../schema/index.js";
import { LAYOUT_PRESETS } from "../schema/definition.js";
import type { LayoutPresetId } from "../schema/definition.js";
import { themeTelemetryBatchSchema } from "../telemetry.js";
import {
  FORM_RUNTIME_SCRIPT,
  renderFormStubPageHtml,
  renderPublishedFormFragment,
  renderPublishedFormPage,
} from "./index.js";

const SCOPE_CLASS: Record<LayoutPresetId, string> = {
  card: "sf-card",
  inline: "sf-inline",
  split: "sf-split",
  conversational: "sf-conv",
};

function publishedWith(preset: LayoutPresetId) {
  const doc = defaultFormDefinition({ brandName: "Acme" });
  doc.layout.preset = preset;
  return publishFormDefinition(doc);
}

describe("renderPublishedFormPage", () => {
  it.each(LAYOUT_PRESETS)("renders a complete %s document", (preset) => {
    const { html, inlineScripts } = renderPublishedFormPage(
      publishedWith(preset),
      { formPath: "/feedback" },
    );

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(`sf-scope ${SCOPE_CLASS[preset]}`);
    // Theme is applied from the derived snapshot, not hardcoded.
    expect(html).toContain("--tf-accent:");
    // Every default question is present as a named control.
    expect(html).toContain('name="answers[content]"');
    expect(html).toContain('name="answers[authorName]"');
    // Submit posts to the runtime submit path.
    expect(html).toContain('action="/feedback/__submit"');
    expect(html).toContain("Share your experience"); // headline
    // Exactly one executable runtime script, returned for CSP hashing.
    expect(inlineScripts).toEqual([FORM_RUNTIME_SCRIPT]);
    expect(html).toContain("<script>");
  });

  it("escapes customer copy — labels and brand cannot inject markup", () => {
    const doc = defaultFormDefinition();
    doc.content.headline = '<img src=x onerror="alert(1)">';
    doc.structure.questions[0]!.label = "</textarea><script>evil()</script>";
    const { html } = renderPublishedFormPage(publishFormDefinition(doc));

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).not.toContain("<script>evil()");
  });

  it("renders the success panel and drops the runtime when submitted", () => {
    const { html, inlineScripts } = renderPublishedFormPage(
      publishedWith("card"),
      { submitted: true },
    );

    expect(html).toContain("sf-success");
    expect(html).toContain("Thank you!");
    expect(html).not.toContain("<form");
    expect(inlineScripts).toEqual([]);
  });

  it("conversational forms flag the runtime to step", () => {
    const { html } = renderPublishedFormPage(publishedWith("conversational"));
    expect(html).toContain('"conversational":true');
  });

  it("conditional questions are hidden up front and carried as data for the runtime", () => {
    const doc = defaultFormDefinition();
    doc.structure.questions.push({
      id: "followup",
      type: "longtext",
      label: "What would have made it a 5?",
      placeholder: "",
      description: "",
      required: false,
      options: [],
      showIf: { questionId: "rating", op: "lt", value: 5 },
    });
    const { html } = renderPublishedFormPage(publishFormDefinition(doc));

    expect(html).toContain('data-show-if=');
    expect(html).toContain('"questionId":"rating"');
  });
});

describe("renderPublishedFormFragment", () => {
  it("is a script-free Shadow DOM fragment, not a document", () => {
    const { html, inlineScripts } = renderPublishedFormFragment(
      publishedWith("card"),
      { brandFallback: "Acme" },
    );

    expect(html).not.toContain("<!doctype");
    expect(html).toContain('part="root"');
    expect(html).toContain('name="answers[content]"');
    // No executable scripts run in a shadow root.
    expect(html).not.toContain("<script");
    expect(inlineScripts).toEqual([]);
  });
});

describe("renderFormStubPageHtml — outage state", () => {
  it("is a complete, script-free document", () => {
    const html = renderFormStubPageHtml({ brandName: "Acme" });
    expect(html).toContain("data-semblia-forms-v4-stub");
    expect(html).toContain("Acme");
    expect(html).not.toContain("<script");
  });

  it("escapes brand names", () => {
    const html = renderFormStubPageHtml({ brandName: '<img src=x onerror=1>"' });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("telemetry contract", () => {
  it("accepts a representative batch and rejects unknown knobs", () => {
    const batch = {
      events: [
        {
          type: "forms_theme.knob_changed",
          formId: "f1",
          presetId: "clean",
          knob: "radius",
          from: 3,
          to: 1,
        },
        {
          type: "forms_theme.published",
          formId: "f1",
          presetId: "clean",
          knobsDiverged: ["radius", "brandColor"],
        },
      ],
    };
    expect(() => themeTelemetryBatchSchema.parse(batch)).not.toThrow();
    expect(() =>
      themeTelemetryBatchSchema.parse({
        events: [
          {
            type: "forms_theme.knob_changed",
            formId: "f1",
            presetId: "clean",
            knob: "fontSizePx",
            from: 14,
            to: 18,
          },
        ],
      }),
    ).toThrow();
  });
});
