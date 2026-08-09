import { describe, expect, it } from "vitest";
import {
  HOSTED_FORM_BASE,
  WIDGET_EMBED_SRC,
  hostedFormLink,
  hostedFormUrl,
  widgetEmbedSnippet,
  widgetPreviewUrl,
} from "@/lib/semblia-urls";

describe("Semblia public URL helpers", () => {
  it("builds hosted form display and actionable links from the shared base", () => {
    expect(HOSTED_FORM_BASE).toBe("forms.semblia.com/f");
    expect(hostedFormUrl("customer-love")).toBe(
      "forms.semblia.com/f/customer-love",
    );
    expect(hostedFormLink("customer-love")).toBe(
      "https://forms.semblia.com/f/customer-love",
    );
  });

  it("builds widget embed snippets from the shared script source", () => {
    expect(WIDGET_EMBED_SRC).toBe("https://widgets.semblia.com/embed.js");
    expect(widgetEmbedSnippet("northwind", "wid_123")).toBe(
      `<script type="module" src="${WIDGET_EMBED_SRC}" async></script>
<semblia-widget project="northwind" widget="wid_123"></semblia-widget>`,
    );
  });

  it("builds widget preview links", () => {
    expect(widgetPreviewUrl("wid_123")).toBe(
      "https://embed.semblia.com/preview/wid_123",
    );
  });
});
