import { describe, expect, it } from "vitest";
import {
  canonicalizeRuntimeRequest,
  formatRuntimeSignature,
  normalizePublicHostname,
  parseRuntimeSignature,
  SEMBLIA_RUNTIME_HEADERS,
} from "./public-surface-contract.js";

describe("public surface runtime contract", () => {
  it("normalizes a public hostname by removing scheme, port, and trailing dot", () => {
    expect(normalizePublicHostname("https://Acme.Forms.Semblia.com.:443")).toBe(
      "acme.forms.semblia.com",
    );
  });

  it.each([
    "https://user:pass@forms.semblia.com",
    "forms.semblia.com/path",
    "forms..semblia.com",
    "-forms.semblia.com",
    "forms-.semblia.com",
    "[::1]",
    "https://[::1]:443",
  ])("rejects malformed or IPv6 hostname %s", (value) => {
    expect(normalizePublicHostname(value)).toBeNull();
  });

  it("canonicalizes the runtime signing vector", () => {
    expect(
      canonicalizeRuntimeRequest({
        timestampSeconds: 1_752_505_200,
        method: "post",
        requestTarget:
          "/v2/runtime/forms/contact/submissions?projectId=project_1&b=2&a=1",
        hostname: "https://Acme.Forms.Semblia.com.:443",
        bodySha256: "a".repeat(64),
      }),
    ).toBe(
      [
        "v1",
        "1752505200",
        "POST",
        "/v2/runtime/forms/contact/submissions?a=1&b=2&projectId=project_1",
        "acme.forms.semblia.com",
        "a".repeat(64),
      ].join("\n"),
    );
  });

  it("sorts query entries by key then value while preserving duplicates", () => {
    expect(
      canonicalizeRuntimeRequest({
        timestampSeconds: 1,
        method: "get",
        requestTarget: "/runtime?b=2&a=z&a=a&a=a",
        hostname: "forms.semblia.com",
        bodySha256: "b".repeat(64),
      }),
    ).toContain("/runtime?a=a&a=a&a=z&b=2\n");
  });

  it("preserves a second literal question mark in the signed query", () => {
    expect(
      canonicalizeRuntimeRequest({
        timestampSeconds: 1,
        method: "get",
        requestTarget: "/runtime?projectId=project_1?duplicate&b=2&a=1",
        hostname: "forms.semblia.com",
        bodySha256: "b".repeat(64),
      }),
    ).toContain("/runtime?a=1&b=2&projectId=project_1%3Fduplicate\n");
  });

  it("uses code-unit ordering for deterministic query canonicalization", () => {
    expect(
      canonicalizeRuntimeRequest({
        timestampSeconds: 1,
        method: "get",
        requestTarget: "/runtime?a=1&A=1",
        hostname: "forms.semblia.com",
        bodySha256: "b".repeat(64),
      }),
    ).toContain("/runtime?A=1&a=1\n");
  });

  it("uses the only accepted runtime signature wire representation", () => {
    const digest = Uint8Array.from({ length: 32 }, (_, index) => index);
    const value =
      "v1=000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

    expect(SEMBLIA_RUNTIME_HEADERS).toEqual({
      host: "x-semblia-runtime-host",
      timestamp: "x-semblia-runtime-timestamp",
      signature: "x-semblia-runtime-signature",
    });
    expect(formatRuntimeSignature(digest)).toBe(value);
    expect(parseRuntimeSignature(value)).toEqual(digest);
    expect(parseRuntimeSignature(value.toUpperCase())).toBeNull();
    expect(parseRuntimeSignature(value.slice(3))).toBeNull();
    expect(parseRuntimeSignature("v1=abc")).toBeNull();
    expect(parseRuntimeSignature(`v1=${"g".repeat(64)}`)).toBeNull();
  });
});
