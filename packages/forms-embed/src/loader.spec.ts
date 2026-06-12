// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SembliaFormElement, embedFragmentUrl, register } from "./loader.js";

const FRAGMENT = `<div data-semblia-forms-v4-stub="true"><style>span{opacity:.7}</style><strong>This form is being rebuilt</strong></div>`;

function mockFetchOnce(body: string, ok = true, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    text: async () => body,
  } as Response);
}

describe("embedFragmentUrl", () => {
  it("builds the project-subdomain fragment URL", () => {
    expect(embedFragmentUrl({ project: "acme" })).toBe(
      "https://acme.collect.semblia.com/__embed",
    );
    expect(embedFragmentUrl({ project: "acme", form: "feedback" })).toBe(
      "https://acme.collect.semblia.com/feedback/__embed",
    );
  });

  it("honors a base-domain override and sanitizes slugs", () => {
    expect(
      embedFragmentUrl({
        project: "acme",
        form: "/fb/",
        baseDomain: "forms.example.dev",
      }),
    ).toBe("https://acme.forms.example.dev/fb/__embed");
  });
});

describe("<semblia-form>", () => {
  beforeEach(() => register());

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("registers exactly once (idempotent)", () => {
    register();
    expect(customElements.get("semblia-form")).toBe(SembliaFormElement);
  });

  it("fetches the fragment and mounts it inside a shadow root", async () => {
    const fetchSpy = mockFetchOnce(FRAGMENT);
    const el = document.createElement("semblia-form");
    el.setAttribute("project", "acme");
    el.setAttribute("form", "feedback");

    const loaded = new Promise((resolve) =>
      el.addEventListener("semblia:load", resolve, { once: true }),
    );
    document.body.appendChild(el);
    await loaded;

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://acme.collect.semblia.com/feedback/__embed",
      expect.objectContaining({ mode: "cors", credentials: "omit" }),
    );
    expect(el.shadowRoot?.innerHTML).toContain("data-semblia-forms-v4-stub");
    // Isolation: the fragment lives in the shadow tree, not the light DOM.
    expect(el.innerHTML).toBe("");
  });

  it("renders the quiet error state when the fetch fails", async () => {
    mockFetchOnce("nope", false, 503);
    const el = document.createElement("semblia-form");
    el.setAttribute("project", "acme");

    const failed = new Promise((resolve) =>
      el.addEventListener("semblia:error", resolve, { once: true }),
    );
    document.body.appendChild(el);
    await failed;

    expect(el.shadowRoot?.textContent).toContain("could not be loaded");
  });

  it("shows the error state immediately when project is missing", () => {
    const el = document.createElement("semblia-form");
    document.body.appendChild(el);
    expect(el.shadowRoot?.textContent).toContain("could not be loaded");
  });
});
