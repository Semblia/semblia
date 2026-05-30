import { describe, expect, it } from "vitest";
import { createFormViewModel } from "./view-model.js";
import { normalizeFormConfig } from "./normalize.js";
import { renderHostedFormHtml } from "./server.js";

describe("renderHostedFormHtml", () => {
  it("renders escaped form copy and a submit action", () => {
    const model = createFormViewModel(
      normalizeFormConfig({
        brandName: "A < B",
        headline: "Feedback & stories",
        subhead: "Tell us what worked.",
      }),
    );

    const html = renderHostedFormHtml({ model, actionPath: "/__submit" });

    expect(html).toContain("A &lt; B");
    expect(html).toContain("Feedback &amp; stories");
    expect(html).toContain("Tell us what worked.");
    expect(html).toContain('action="/__submit"');
  });
});
