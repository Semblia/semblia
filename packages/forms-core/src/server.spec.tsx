import { describe, expect, it } from "vitest";
import { createFormViewModel } from "./view-model.js";
import { normalizeFormConfig } from "./normalize.js";
import { HOSTED_RUNTIME_SHA256, renderHostedFormHtml } from "./server.js";

function render(config: unknown, submitted = false) {
  return renderHostedFormHtml({
    model: createFormViewModel(normalizeFormConfig(config)),
    actionPath: "/__submit",
    submitted,
  });
}

/** The document without the inlined runtime/config scripts. */
function renderMarkup(config: unknown, submitted = false) {
  return render(config, submitted).split("<script")[0] ?? "";
}

describe("renderHostedFormHtml", () => {
  it("renders escaped form copy and a submit action", () => {
    const html = render({
      brandName: "A < B",
      headline: "Feedback & stories",
      subhead: "Tell us what worked.",
    });

    expect(html).toContain("A &lt; B");
    expect(html).toContain("Feedback &amp; stories");
    expect(html).toContain("Tell us what worked.");
    expect(html).toContain('action="/__submit"');
  });

  it("inlines the client runtime with a stable CSP hash", () => {
    const html = render({});
    expect(html).toContain('<script type="application/json" id="hf-config">');
    expect(html).toMatch(/<script>.*hf-root.*<\/script>/s);
    expect(HOSTED_RUNTIME_SHA256).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it("renders the split container with a hero panel", () => {
    const html = render({
      layout: { container: "split", hero: "side" },
    });
    expect(html).toContain('data-container="split"');
    expect(html).toContain("hf-split-hero");
    expect(html).toContain("hf-split-form");
  });

  it("renders rich controls from real inputs", () => {
    const html = renderMarkup({
      questions: [
        { id: "rate", type: "stars", label: "Rate", required: true },
        { id: "nps", type: "nps", label: "Recommend?", required: false },
        { id: "mood", type: "emoji", label: "Mood", required: false },
        {
          id: "pick",
          type: "radio",
          label: "Pick",
          required: false,
          options: ["One", "Two"],
        },
      ],
    });

    // 5 star radios + 11 NPS chips + 5 emoji chips + 2 choice radios
    expect(html.match(/<input[^>]*type="radio"/g)?.length).toBe(23);
    expect(html).toContain("hf-stars");
    expect(html).toContain("hf-scale");
    expect(html).toContain("hf-emoji-chip");
    expect(html).toContain("hf-choice");
    expect(html).toContain("Not likely");
  });

  it("renders the loader overlay only when enabled", () => {
    expect(renderMarkup({ loader: { enabled: true } })).toContain(
      'class="hf-loader"',
    );
    expect(renderMarkup({ loader: { enabled: false } })).not.toContain(
      'class="hf-loader"',
    );
  });

  it("renders the success screen when submitted", () => {
    const html = render(
      {
        success: {
          title: "Thanks a ton!",
          message: "We got it.",
          action: "cta",
          ctaLabel: "Back to site",
          ctaUrl: "https://example.com",
          showConfetti: true,
        },
      },
      true,
    );

    expect(html).toContain("hf-success");
    expect(html).toContain("Thanks a ton!");
    expect(html).toContain("hf-confetti");
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("hf-config");
  });

  it("emits a meta refresh for the redirect success action", () => {
    const html = render(
      {
        success: {
          action: "redirect",
          redirectUrl: "https://example.com/done",
        },
      },
      true,
    );
    expect(html).toContain(
      'http-equiv="refresh" content="1.4;url=https://example.com/done"',
    );
  });

  it("loads Google webfonts referenced by the tokens", () => {
    const html = render({
      tokens: { fontHead: '"Space Grotesk", sans-serif' },
    });
    expect(html).toContain("fonts.googleapis.com/css2?family=Space+Grotesk");
    expect(html).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
  });

  it("skips font links for system-only stacks", () => {
    const html = render({
      tokens: {
        fontHead: "Georgia, serif",
        fontBody: "system-ui, sans-serif",
        fontMono: "ui-monospace, monospace",
      },
    });
    expect(html).not.toContain("fonts.googleapis.com");
  });
});
