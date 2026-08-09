import { describe, expect, it } from "vitest";
import {
  FORM_EMBED_SRC,
  WIDGET_EMBED_SRC,
  formEmbedSnippet,
  widgetEmbedSnippet,
} from "@/lib/semblia-urls";

describe("Semblia shared-asset embed snippets", () => {
  it("builds widget embed snippets from the shared script source", () => {
    expect(WIDGET_EMBED_SRC).toBe("https://widgets.semblia.com/embed.js");
    expect(widgetEmbedSnippet("northwind", "wid_123")).toBe(
      `<script type="module" src="${WIDGET_EMBED_SRC}" async></script>
<semblia-widget project="northwind" widget="wid_123"></semblia-widget>`,
    );
  });

  it("builds form embed snippets from the shared script source", () => {
    expect(FORM_EMBED_SRC).toBe("https://forms.semblia.com/embed.js");
    expect(formEmbedSnippet("proj_1", "customer-love")).toBe(
      `<script src="${FORM_EMBED_SRC}" async></script>
<semblia-form project="proj_1" form="customer-love"></semblia-form>`,
    );
  });
});
