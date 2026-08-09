import { describe, expect, it } from "vitest";
import type { V2PublicSurfaceHostDTO } from "@workspace/types";
import {
  defaultLiveHost,
  hostedFormLink,
  previewCollectionHostname,
  previewWallHostname,
  wallLink,
  wallRootLink,
} from "@/lib/public-hosts";

function host(
  overrides: Partial<V2PublicSurfaceHostDTO> = {},
): V2PublicSurfaceHostDTO {
  return {
    id: "host_1",
    projectId: "project_1",
    feature: "COLLECTION",
    resourceType: "PROJECT",
    resourceId: "project_1",
    hostname: "acme.forms.semblia.com",
    isDefault: true,
    status: "ACTIVE",
    verifiedAt: "2026-08-01T00:00:00.000Z",
    retiredAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

// WS-A1: every URL the app displays comes from issued PublicSurfaceHost rows.
describe("defaultLiveHost", () => {
  it("returns the single live default for the feature", () => {
    const hosts = [
      host(),
      host({
        id: "host_wall",
        feature: "WALL",
        hostname: "acme.walls.semblia.com",
      }),
    ];
    expect(defaultLiveHost(hosts, "COLLECTION")?.hostname).toBe(
      "acme.forms.semblia.com",
    );
    expect(defaultLiveHost(hosts, "WALL")?.hostname).toBe(
      "acme.walls.semblia.com",
    );
  });

  it("refuses hosts that are not live, not default, or not project-scoped", () => {
    expect(
      defaultLiveHost([host({ status: "PENDING_VERIFICATION" })], "COLLECTION"),
    ).toBeNull();
    expect(
      defaultLiveHost([host({ verifiedAt: null })], "COLLECTION"),
    ).toBeNull();
    expect(
      defaultLiveHost(
        [host({ retiredAt: "2026-08-02T00:00:00.000Z" })],
        "COLLECTION",
      ),
    ).toBeNull();
    expect(
      defaultLiveHost([host({ isDefault: false })], "COLLECTION"),
    ).toBeNull();
    expect(
      defaultLiveHost([host({ resourceType: "FORM" })], "COLLECTION"),
    ).toBeNull();
  });

  it("treats two live defaults as a conflict, not a choice", () => {
    expect(
      defaultLiveHost(
        [host(), host({ id: "host_2", hostname: "other.forms.semblia.com" })],
        "COLLECTION",
      ),
    ).toBeNull();
    expect(defaultLiveHost(undefined, "COLLECTION")).toBeNull();
  });
});

describe("URL builders", () => {
  it("builds URLs only when both host and slug exist", () => {
    expect(hostedFormLink("acme.forms.semblia.com", "customer-love")).toBe(
      "https://acme.forms.semblia.com/f/customer-love",
    );
    expect(hostedFormLink(null, "customer-love")).toBeNull();
    expect(hostedFormLink("acme.forms.semblia.com", null)).toBeNull();
    expect(wallLink("acme.walls.semblia.com", "proof")).toBe(
      "https://acme.walls.semblia.com/w/proof",
    );
    expect(wallLink(null, "proof")).toBeNull();
    expect(wallRootLink("acme.walls.semblia.com")).toBe(
      "https://acme.walls.semblia.com/",
    );
    expect(wallRootLink(null)).toBeNull();
  });

  it("previews the shape the API will issue for a chosen slug", () => {
    expect(previewCollectionHostname("acme")).toBe("acme.forms.semblia.com");
    expect(previewWallHostname("acme")).toBe("acme.walls.semblia.com");
  });
});
