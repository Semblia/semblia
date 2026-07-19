import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";

describe("PublicHostingObservabilityService", () => {
  it("resolves the default writer with compiled constructor metadata", async () => {
    // Vitest omits design:paramtypes, so mirror the metadata emitted by nest build.
    const originalParamTypes = Reflect.getMetadata(
      "design:paramtypes",
      PublicHostingObservabilityService,
    ) as unknown;
    Reflect.defineMetadata(
      "design:paramtypes",
      [Function],
      PublicHostingObservabilityService,
    );
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    let closeModule: (() => Promise<void>) | undefined;

    try {
      const moduleRef = await Test.createTestingModule({
        providers: [PublicHostingObservabilityService],
      }).compile();
      closeModule = () => moduleRef.close();
      const service = moduleRef.get(PublicHostingObservabilityService);

      service.record({
        event: "public_host_resolution",
        outcome: "miss",
        reason: "host_not_found",
      });

      expect(info).toHaveBeenCalledWith(
        JSON.stringify({
          event: "public_host_resolution",
          outcome: "miss",
          reason: "host_not_found",
          metricValue: 1,
        }),
      );
    } finally {
      await closeModule?.();
      info.mockRestore();
      if (originalParamTypes === undefined) {
        Reflect.deleteMetadata(
          "design:paramtypes",
          PublicHostingObservabilityService,
        );
      } else {
        Reflect.defineMetadata(
          "design:paramtypes",
          originalParamTypes,
          PublicHostingObservabilityService,
        );
      }
    }
  });

  it("emits a safe public-host resolution event without payload or secret fields", () => {
    const write = vi.fn();
    const service = new PublicHostingObservabilityService(write);

    service.record({
      event: "public_host_resolution",
      outcome: "hit",
      reason: "canonical",
      hostname: "acme.forms.semblia.com",
      projectId: "project_1",
      feature: "COLLECTION",
      requestId: "request_1",
    });

    expect(write).toHaveBeenCalledWith({
      event: "public_host_resolution",
      outcome: "hit",
      reason: "canonical",
      metricValue: 1,
      hostname: "acme.forms.semblia.com",
      projectId: "project_1",
      feature: "COLLECTION",
      requestId: "request_1",
    });
    const event = write.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event).not.toHaveProperty("formSlug");
    expect(event).not.toHaveProperty("answers");
    expect(event).not.toHaveProperty("bodyHash");
    expect(event).not.toHaveProperty("signature");
    expect(event).not.toHaveProperty("origin");
    expect(event).not.toHaveProperty("upstreamBody");
  });

  it("allowlists event fields when an untyped caller supplies sensitive data", () => {
    const write = vi.fn();
    const service = new PublicHostingObservabilityService(write);

    service.record({
      event: "forms_runtime_signature_rejection",
      outcome: "rejected",
      reason: "host_not_found",
      hostname: "HTTPS://ACME.forms.semblia.com.:443",
      requestId: " request_1 ",
      signature: "must-not-log",
      answers: [{ value: "must-not-log" }],
      bodyHash: "must-not-log",
      raw: "must-not-log",
      payload: { secret: "must-not-log" },
    } as unknown as Parameters<typeof service.record>[0]);

    expect(write).toHaveBeenCalledWith({
      event: "forms_runtime_signature_rejection",
      outcome: "rejected",
      reason: "host_not_found",
      metricValue: 1,
      hostname: "acme.forms.semblia.com",
      requestId: "request_1",
    });
    const event = write.mock.calls[0]?.[0] as Record<string, unknown>;
    for (const prohibited of [
      "signature",
      "answers",
      "bodyHash",
      "raw",
      "payload",
    ]) {
      expect(event).not.toHaveProperty(prohibited);
    }
  });
});
