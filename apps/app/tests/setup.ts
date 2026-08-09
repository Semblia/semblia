import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

if (
  typeof (globalThis as unknown as { ResizeObserver?: unknown })
    .ResizeObserver === "undefined"
) {
  class ResizeObserverMock {
    // Accepts the callback like the real API (never invoked in tests).
    constructor(callback: ResizeObserverCallback) {
      void callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverMock;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (
  typeof (globalThis as unknown as { structuredClone?: unknown })
    .structuredClone === "undefined"
) {
  (
    globalThis as unknown as { structuredClone: <T>(v: T) => T }
  ).structuredClone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
}
