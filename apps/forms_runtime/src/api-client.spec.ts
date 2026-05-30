import { describe, expect, it } from "vitest";
import { signRuntimeRequest } from "./api-client.js";

describe("signRuntimeRequest", () => {
  it("creates a v1 HMAC signature over method, path, timestamp, and body hash", () => {
    const headers = signRuntimeRequest({
      method: "POST",
      path: "/runtime/forms/resolve",
      timestamp: 1710000000000,
      body: '{"ok":true}',
      secret: "x".repeat(32),
    });

    expect(headers["x-tresta-runtime"]).toBe("forms");
    expect(headers["x-tresta-runtime-timestamp"]).toBe("1710000000000");
    expect(headers["x-tresta-runtime-signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
  });
});
