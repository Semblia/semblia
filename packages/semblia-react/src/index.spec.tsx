// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FORM_EMBED_SRC, WIDGET_EMBED_SRC } from "@semblia/embed";
import { SembliaForm, SembliaWidget } from "./index.js";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.head.innerHTML = "";
});

describe("SembliaWidget", () => {
  it("renders the custom element with the snippet's attributes", () => {
    act(() => {
      root.render(
        <SembliaWidget project="acme" widget="widget_123" className="w" />,
      );
    });

    const element = container.querySelector("semblia-widget");
    expect(element).toBeTruthy();
    expect(element?.getAttribute("project")).toBe("acme");
    expect(element?.getAttribute("widget")).toBe("widget_123");
    expect(element?.getAttribute("class")).toBe("w");
  });

  it("injects the CDN script once for many widgets", () => {
    act(() => {
      root.render(
        <>
          <SembliaWidget project="acme" widget="a" />
          <SembliaWidget project="acme" widget="b" />
        </>,
      );
    });

    const scripts = document.querySelectorAll(
      `script[src="${WIDGET_EMBED_SRC}"]`,
    );
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).type).toBe("module");
  });

  it("wires onLoad/onError to the runtime's custom events", () => {
    const onLoad = vi.fn();
    const onError = vi.fn();
    act(() => {
      root.render(
        <SembliaWidget
          project="acme"
          widget="widget_123"
          onLoad={onLoad}
          onError={onError}
        />,
      );
    });

    const element = container.querySelector("semblia-widget");
    element?.dispatchEvent(new CustomEvent("semblia:widget-load"));
    element?.dispatchEvent(new CustomEvent("semblia:widget-error"));

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("SembliaForm", () => {
  it("renders the custom element and loads the forms runtime", () => {
    act(() => {
      root.render(
        <SembliaForm project="acme" form="customer-feedback" title="Feedback" />,
      );
    });

    const element = container.querySelector("semblia-form");
    expect(element?.getAttribute("project")).toBe("acme");
    expect(element?.getAttribute("form")).toBe("customer-feedback");
    expect(element?.getAttribute("title")).toBe("Feedback");

    const scripts = document.querySelectorAll(
      `script[src="${FORM_EMBED_SRC}"]`,
    );
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).type).toBe("");
  });
});
