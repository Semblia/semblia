import { describe, expect, it, vi } from "vitest";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";

describe("PublicHostingObservabilityService", () => {
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
});
