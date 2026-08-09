import { describe, expect, it } from "vitest";
import { EmailTemplateKey } from "@workspace/database/prisma";
import { renderEmailTemplate } from "./email-templates.js";
import type { ResponseThankYouEmailPayload } from "./email.types.js";

function thankYou(
  overrides: Partial<ResponseThankYouEmailPayload> = {},
): ResponseThankYouEmailPayload {
  return {
    kind: "DEFAULT",
    projectName: "Agency Portfolio",
    authorName: "Rowan Iyer",
    quote: "The review queue is the part I did not know I needed.",
    message: null,
    formName: null,
    formUrl: null,
    ...overrides,
  };
}

function render(payload: ResponseThankYouEmailPayload) {
  return renderEmailTemplate({
    template: EmailTemplateKey.RESPONSE_THANK_YOU,
    payload,
  });
}

describe("response thank-you email", () => {
  it("speaks in the project's name, not the app's", () => {
    const { subject, html, text } = render(thankYou());
    expect(subject).toBe("Thank you, Rowan Iyer — Agency Portfolio");
    // The recipient has no Semblia account; a dashboard CTA would be a dead end.
    expect(html).not.toContain("Open in Semblia");
    expect(text).toContain("Agency Portfolio");
    expect(text).toContain(
      "The review queue is the part I did not know I needed.",
    );
  });

  it("greets an anonymous author without an empty name", () => {
    const { subject } = render(thankYou({ authorName: null }));
    expect(subject).toBe("Thank you — Agency Portfolio");
  });

  it("sends the owner's own words verbatim, with nothing wrapped around them", () => {
    const { html, text } = render(
      thankYou({ kind: "CUSTOM", message: "You made our week.\n\nCome back." }),
    );
    expect(text).toContain("You made our week.");
    expect(text).toContain("Come back.");
    // The stock line must not ride along under a message the owner wrote.
    expect(html).not.toContain("genuinely helps");
  });

  it("carries exactly one link for an invite, and only when there is a form", () => {
    const invited = render(
      thankYou({
        kind: "INVITE",
        formName: "Case study intake",
        formUrl: "https://forms.semblia.com/f/case-study",
      }),
    );
    expect(invited.html).toContain("https://forms.semblia.com/f/case-study");
    expect(invited.text).toContain("Share more: Case study intake");

    // An INVITE whose form failed to resolve degrades to a plain thank-you
    // rather than rendering a button with no destination.
    const linkless = render(thankYou({ kind: "INVITE" }));
    expect(linkless.html).not.toContain('href=""');
    expect(linkless.text).not.toContain("Share more");
  });

  it("escapes the author's words instead of trusting them as markup", () => {
    const { html } = render(
      thankYou({ quote: '<script>alert("x")</script> & "quoted"' }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("quotes an excerpt rather than the whole essay back at its author", () => {
    const long = "word ".repeat(200).trim();
    const { html } = render(thankYou({ quote: long }));
    expect(html).toContain("…");
    expect(html.length).toBeLessThan(long.length + 4000);
  });
});
