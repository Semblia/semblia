// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SembliaWidgetElement,
  register,
  widgetFragmentUrl,
} from "./loader.js";

const FRAGMENT = `<div data-semblia-widget="true"><style>.sw{display:block}</style><article>Great product</article></div>`;

function mockFetchOnce(body: string, ok = true, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    text: async () => body,
  } as Response);
}

describe("widgetFragmentUrl", () => {
  it("builds the API fragment URL", () => {
    expect(
      widgetFragmentUrl({ project: "acme", widget: "widget_123" }),
    ).toBe(
      "https://api.semblia.com/v2/widget-embeds/projects/acme/widget_123/fragment",
    );
  });

  it("honors an api-base override", () => {
    expect(
      widgetFragmentUrl({
        project: "acme",
        widget: "widget_123",
        apiBase: "http://localhost:8100/v2/",
      }),
    ).toBe(
      "http://localhost:8100/v2/widget-embeds/projects/acme/widget_123/fragment",
    );
  });
});

describe("<semblia-widget>", () => {
  beforeEach(() => register());

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("registers exactly once", () => {
    register();
    expect(customElements.get("semblia-widget")).toBe(SembliaWidgetElement);
  });

  it("fetches and mounts the fragment inside a shadow root", async () => {
    const fetchSpy = mockFetchOnce(FRAGMENT);
    const el = document.createElement("semblia-widget");
    el.setAttribute("project", "acme");
    el.setAttribute("widget", "widget_123");

    const loaded = new Promise((resolve) =>
      el.addEventListener("semblia:widget-load", resolve, { once: true }),
    );
    document.body.appendChild(el);
    await loaded;

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.semblia.com/v2/widget-embeds/projects/acme/widget_123/fragment",
      expect.objectContaining({ mode: "cors", credentials: "omit" }),
    );
    expect(el.shadowRoot?.innerHTML).toContain("Great product");
    expect(el.innerHTML).toBe("");
  });

  it("renders an error state when required attributes are missing", () => {
    const el = document.createElement("semblia-widget");
    document.body.appendChild(el);
    expect(el.shadowRoot?.textContent).toContain("could not be loaded");
  });

  it("dispatches the error event when fetch fails", async () => {
    mockFetchOnce("nope", false, 503);
    const el = document.createElement("semblia-widget");
    el.setAttribute("project", "acme");
    el.setAttribute("widget", "widget_123");

    const failed = new Promise((resolve) =>
      el.addEventListener("semblia:widget-error", resolve, { once: true }),
    );
    document.body.appendChild(el);
    await failed;

    expect(el.shadowRoot?.textContent).toContain("could not be loaded");
  });
});
