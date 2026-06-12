import { createHash, createHmac } from "node:crypto";
import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { FormsRuntimeSignatureService } from "./forms-runtime-signature.service.js";

function sign(input: {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  secret: string;
}) {
  const bodyHash = createHash("sha256").update(input.body).digest("hex");
  const payload = [
    input.method.toUpperCase(),
    input.path,
    String(input.timestamp),
    bodyHash,
  ].join("\n");

  return `v1=${createHmac("sha256", input.secret)
    .update(payload)
    .digest("hex")}`;
}

function makeService(secret: string | undefined) {
  return new FormsRuntimeSignatureService({
    get: vi.fn(() => secret),
  } as unknown as ConfigService);
}

describe("FormsRuntimeSignatureService", () => {
  it("accepts a fresh v1 runtime signature", () => {
    const now = 1_710_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const secret = "s".repeat(32);
    const body = JSON.stringify({ projectPublicSlug: "acme" });
    const service = makeService(secret);

    expect(() =>
      service.verify(
        {
          method: "POST",
          rawBody: body,
          headers: {
            "x-semblia-runtime": "forms",
            "x-semblia-runtime-timestamp": String(now),
            "x-semblia-runtime-signature": sign({
              method: "POST",
              path: "/runtime/forms/resolve",
              timestamp: now,
              body,
              secret,
            }),
          },
        },
        "/runtime/forms/resolve",
      ),
    ).not.toThrow();
  });

  it("rejects missing config, stale timestamps, and bad signatures", () => {
    const now = 1_710_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    expect(() =>
      makeService(undefined).verify(
        { method: "POST", rawBody: "{}", headers: {} },
        "/runtime/forms/resolve",
      ),
    ).toThrow(ServiceUnavailableException);

    expect(() =>
      makeService("s".repeat(32)).verify(
        {
          method: "POST",
          rawBody: "{}",
          headers: {
            "x-semblia-runtime": "forms",
            "x-semblia-runtime-timestamp": String(now - 600_000),
            "x-semblia-runtime-signature": "v1=" + "0".repeat(64),
          },
        },
        "/runtime/forms/resolve",
      ),
    ).toThrow(UnauthorizedException);

    expect(() =>
      makeService("s".repeat(32)).verify(
        {
          method: "POST",
          rawBody: "{}",
          headers: {
            "x-semblia-runtime": "forms",
            "x-semblia-runtime-timestamp": String(now),
            "x-semblia-runtime-signature": "v1=" + "0".repeat(64),
          },
        },
        "/runtime/forms/resolve",
      ),
    ).toThrow(UnauthorizedException);
  });
});
