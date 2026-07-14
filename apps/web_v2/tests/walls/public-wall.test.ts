import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProjectWall, PublicWallUnavailableError, resolveProjectWallHost } from "@/lib/walls/public-wall";

const hostname = "acme.walls.semblia.com";
const resolution = { feature: "WALL", requestedHostname: hostname, walls: [{ wallSlug: "proof", isPrimaryWall: true }] };
const envelope = (data: unknown) => ({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ success: true, data }) }) as unknown as Response;

afterEach(() => vi.unstubAllGlobals());

describe("host-bound public wall data", () => {
  it("normalizes the host, uses no-store resolution, and rejects a malformed envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(envelope(resolution)).mockResolvedValueOnce(envelope({ success: false }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveProjectWallHost("ACME.walls.semblia.com.:3000")).resolves.toMatchObject({ requestedHostname: hostname });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`hostname=${hostname}`), expect.objectContaining({ cache: "no-store" }));
    await expect(resolveProjectWallHost(hostname)).rejects.toBeInstanceOf(PublicWallUnavailableError);
  });

  it("fails closed for exact/deep hosts, network failures, and malformed payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(resolveProjectWallHost("walls.semblia.com")).resolves.toBeNull();
    await expect(resolveProjectWallHost("deep.acme.walls.semblia.com")).resolves.toBeNull();
    await expect(fetchProjectWall(hostname, "proof")).rejects.toBeInstanceOf(PublicWallUnavailableError);
  });
});
