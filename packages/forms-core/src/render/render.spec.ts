import { describe, expect, it } from "vitest";
import { defaultFormDefinition, publishFormDefinition } from "../schema/index.js";
import { themeTelemetryBatchSchema } from "../telemetry.js";
import {
  FormsV4NotImplementedError,
  renderFormStubPageHtml,
  renderPublishedFormHtml,
} from "./index.js";

describe("renderPublishedFormHtml — loud stub", () => {
  it("throws FormsV4NotImplementedError naming the preset, never a silent fallback", () => {
    const published = publishFormDefinition(defaultFormDefinition());
    expect(() => renderPublishedFormHtml(published)).toThrow(
      FormsV4NotImplementedError,
    );
    expect(() => renderPublishedFormHtml(published)).toThrow(/"card"/);
  });
});

describe("renderFormStubPageHtml", () => {
  it("is a complete, marked, script-free document", () => {
    const html = renderFormStubPageHtml({ brandName: "Acme" });
    expect(html).toContain("data-tresta-forms-v4-stub");
    expect(html).toContain("TRESTA FORMS V4 STUB");
    expect(html).toContain("Acme");
    expect(html).not.toContain("<script");
  });

  it("escapes brand names — host-controlled text cannot inject markup", () => {
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
            knob: "fontSizePx", // freeform knobs do not exist anymore
            from: 14,
            to: 18,
          },
        ],
      }),
    ).toThrow();
  });
});
