import { describe, expect, it } from "vitest";
import type { V2ProjectActionAuditDTO } from "@workspace/types";
import {
  CLUSTER_GAP_MS,
  clusterAuditEvents,
  summarizeCluster,
} from "@/components/developers/audit/audit-cluster";

function event(
  id: string,
  createdAt: string,
  overrides: Partial<V2ProjectActionAuditDTO> = {},
): V2ProjectActionAuditDTO {
  return {
    id,
    projectId: "proj_1",
    actorType: "user",
    actorId: "user_1",
    credentialId: null,
    action: "response.review_status_updated",
    targetType: "response",
    targetId: null,
    metadata: null,
    createdAt,
    ...overrides,
  };
}

describe("clusterAuditEvents", () => {
  it("groups consecutive same-actor events within the gap into one burst", () => {
    const clusters = clusterAuditEvents([
      event("a", "2026-08-01T10:10:00.000Z"),
      event("b", "2026-08-01T10:05:00.000Z"),
      event("c", "2026-08-01T10:01:00.000Z"),
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].events.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(clusters[0].key).toBe("a");
  });

  it("splits when the gap between neighbours exceeds the window", () => {
    const clusters = clusterAuditEvents([
      event("a", "2026-08-01T10:00:00.000Z"),
      event(
        "b",
        new Date(
          Date.parse("2026-08-01T10:00:00.000Z") - CLUSTER_GAP_MS - 1,
        ).toISOString(),
      ),
    ]);

    expect(clusters).toHaveLength(2);
  });

  it("rolls the window forward, so a slow steady burst stays one block", () => {
    // 9 minutes apart pairwise — 18 minutes end to end, still one burst.
    const clusters = clusterAuditEvents([
      event("a", "2026-08-01T10:18:00.000Z"),
      event("b", "2026-08-01T10:09:00.000Z"),
      event("c", "2026-08-01T10:00:00.000Z"),
    ]);

    expect(clusters).toHaveLength(1);
  });

  it("splits on a different actor even inside the window", () => {
    const clusters = clusterAuditEvents([
      event("a", "2026-08-01T10:02:00.000Z"),
      event("b", "2026-08-01T10:01:00.000Z", { actorId: "user_2" }),
      event("c", "2026-08-01T10:00:00.000Z"),
    ]);

    expect(clusters).toHaveLength(3);
  });
});

describe("summarizeCluster", () => {
  it("ranks actions by count and folds the tail into +n more", () => {
    const summary = summarizeCluster([
      event("a", "2026-08-01T10:04:00.000Z"),
      event("b", "2026-08-01T10:03:00.000Z"),
      event("c", "2026-08-01T10:02:00.000Z", { action: "response.annotated" }),
      event("d", "2026-08-01T10:01:00.000Z", { action: "api_key.rotated" }),
    ]);

    expect(summary).toMatch(/Response Review Status Updated ×2/);
    expect(summary).toMatch(/\+1 more$/);
  });
});
