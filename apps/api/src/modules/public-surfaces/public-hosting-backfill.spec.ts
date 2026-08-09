import { PublicSurfaceFeature, PublicSurfaceResourceType, WidgetType } from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import { backfillPublicHosting } from "./public-hosting-backfill.js";
import { parsePublicHostingBackfillArgs } from "../../scripts/backfill-public-hosting.js";

const date = new Date("2026-07-15T00:00:00.000Z");
function project(overrides: Record<string, unknown> = {}) {
  return { id: "project_1", slug: "acme", createdAt: date, publicSurfaceHosts: [], widgets: [], ...overrides };
}
function host(overrides: Record<string, unknown> = {}) {
  return { id: "host_1", projectId: "project_1", feature: PublicSurfaceFeature.COLLECTION, resourceType: PublicSurfaceResourceType.PROJECT, resourceId: "project_1", hostname: "acme.forms.semblia.com", isDefault: true, status: "ACTIVE", verifiedAt: date, retiredAt: null, createdAt: date, ...overrides };
}
function wall(overrides: Record<string, unknown> = {}) {
  return { id: "wall_1", kind: WidgetType.WALL_OF_LOVE, isActive: true, wallSlug: "proof", publishedSnapshot: {}, isPrimaryWall: false, createdAt: date, ...overrides };
}
function prisma(projects: ReturnType<typeof project>[], allHosts: ReturnType<typeof host>[] = []) {
  const client = {
    project: { findMany: vi.fn().mockResolvedValue(projects) },
    publicSurfaceHost: { findMany: vi.fn().mockResolvedValue(allHosts), create: vi.fn(), update: vi.fn() },
    widget: { updateMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
  return { ...client, $transaction: vi.fn(async (callback) => callback(client)) };
}
const options = (apply = false) => ({ apply, formsBaseDomain: "forms.semblia.com", wallsBaseDomain: "walls.semblia.com", log: vi.fn() });

describe("public hosting backfill", () => {
  it("is dry-run by default at the executor boundary and plans missing managed hosts", async () => {
    const db = prisma([project()]); const input = options();
    const summary = await backfillPublicHosting(db as never, input);
    expect(summary).toMatchObject({ projectsScanned: 1, missingCollectionHosts: 1, missingWallHosts: 1, changed: 0 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.publicSurfaceHost.create).not.toHaveBeenCalled();
  });

  it("repairs resource/default/managed verification and preserves legacy rows without deletion", async () => {
    const legacy = host({ id: "legacy", hostname: "https://Acme.Testimonials.Semblia.com.:443", isDefault: true, verifiedAt: null });
    const current = host({ id: "current", resourceId: null, isDefault: false, verifiedAt: null });
    const db = prisma([project({ publicSurfaceHosts: [legacy, current] })], [legacy, current]);
    const summary = await backfillPublicHosting(db as never, options(true));
    expect(summary.changed).toBeGreaterThan(0);
    expect(summary).toMatchObject({ legacyHosts: 1, unverifiedExternalHosts: 0, manualResolutionRequired: 0 });
    expect(db.publicSurfaceHost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "legacy" }, data: expect.objectContaining({ isDefault: false }) }));
    expect(db.publicSurfaceHost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "current" }, data: expect.objectContaining({ resourceId: "project_1", verifiedAt: expect.any(Date) }) }));
  });

  it("leaves invalid labels, hostname collisions, and unverified external hosts manual and untouched", async () => {
    const external = host({ id: "external", hostname: "customer.example.com", verifiedAt: null });
    const db = prisma([project({ slug: "www", publicSurfaceHosts: [external] })], [external]);
    const summary = await backfillPublicHosting(db as never, options(true));
    expect(summary).toMatchObject({ unverifiedExternalHosts: 1, manualResolutionRequired: 1 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.publicSurfaceHost.update).not.toHaveBeenCalled();
  });

  it("normalizes safely, but treats normalized duplicates and retired reservations as manual", async () => {
    const safe = host({ hostname: "https://Acme.Forms.Semblia.com.:443" });
    const safeDb = prisma([project({ publicSurfaceHosts: [safe] })], [safe]);
    await backfillPublicHosting(safeDb as never, options(true));
    expect(safeDb.publicSurfaceHost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "host_1" }, data: { hostname: "acme.forms.semblia.com" } }));

    const duplicate = host({ id: "duplicate", hostname: "ACME.forms.semblia.com" });
    const conflictDb = prisma([project({ publicSurfaceHosts: [safe, duplicate] })], [safe, duplicate]);
    await expect(backfillPublicHosting(conflictDb as never, options(true))).resolves.toMatchObject({ normalizationConflicts: expect.any(Number), manualResolutionRequired: 1 });
    expect(conflictDb.$transaction).not.toHaveBeenCalled();

    const retired = host({ status: "DISABLED", retiredAt: date });
    const retiredDb = prisma([project({ publicSurfaceHosts: [retired] })], [retired]);
    await expect(backfillPublicHosting(retiredDb as never, options(true))).resolves.toMatchObject({ manualResolutionRequired: 1 });
    expect(retiredDb.publicSurfaceHost.create).not.toHaveBeenCalled();

    const foreignTombstone = host({ id: "foreign", projectId: null, hostname: "acme.walls.semblia.com", status: "DISABLED", retiredAt: date });
    const crossDb = prisma([project()], [foreignTombstone]);
    await expect(backfillPublicHosting(crossDb as never, options(true))).resolves.toMatchObject({ manualResolutionRequired: 1 });
    expect(crossDb.publicSurfaceHost.create).not.toHaveBeenCalled();
  });

  it("requires manual review for mismatched project resources and keeps logs identifier-only", async () => {
    const broken = host({ resourceId: "other_project", hostname: "acme.forms.semblia.com" });
    const input = options(true); const db = prisma([project({ publicSurfaceHosts: [broken] })], [broken]);
    const summary = await backfillPublicHosting(db as never, input);
    expect(summary).toMatchObject({ inconsistentResources: 1, manualResolutionRequired: 1 });
    expect(input.log).toHaveBeenCalled();
    expect(input.log.mock.calls.flat().join(" ")).not.toContain("acme.forms.semblia.com");
  });

  it("repairs an eligible primary deterministically and treats no eligible wall as informational", async () => {
    const first = wall({ id: "wall_first", createdAt: new Date("2026-01-01") });
    const second = wall({ id: "wall_second", createdAt: new Date("2026-02-01"), isPrimaryWall: false });
    const db = prisma([project({ widgets: [second, first] })]);
    const summary = await backfillPublicHosting(db as never, options(true));
    expect(summary.zeroPrimaryWithEligibleWallProjects).toBe(1);
    expect(db.widget.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "wall_first", isPrimaryWall: { not: true } }, data: { isPrimaryWall: true } }));
    const noWall = prisma([project({ widgets: [] })]);
    await expect(backfillPublicHosting(noWall as never, options())).resolves.toMatchObject({ noEligibleWallProjects: 1, changed: 0 });
  });

  it("clears duplicate and ineligible primaries, and retries a hostname P2002 only as a whole transaction", async () => {
    const eligible = wall({ id: "eligible", isPrimaryWall: true });
    const inactive = wall({ id: "inactive", isActive: false, isPrimaryWall: true });
    const primaryDb = prisma([project({ widgets: [eligible, inactive] })]);
    await backfillPublicHosting(primaryDb as never, options(true));
    expect(primaryDb.widget.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["inactive"] } }, data: { isPrimaryWall: false } }));

    const raceDb = prisma([project()]);
    raceDb.publicSurfaceHost.create.mockRejectedValue({ code: "P2002", meta: { target: ["hostname"] } });
    const summary = await backfillPublicHosting(raceDb as never, options(true));
    expect(raceDb.$transaction).toHaveBeenCalledTimes(2);
    expect(summary.manualResolutionRequired).toBeGreaterThan(0);
    const unrelatedDb = prisma([project()]);
    const uniqueFailure = { code: "P2002", meta: { target: ["projectId", "name"] } };
    unrelatedDb.publicSurfaceHost.create.mockRejectedValue(uniqueFailure);
    await expect(backfillPublicHosting(unrelatedDb as never, options(true))).rejects.toBe(uniqueFailure);
  });

  it("re-reads the project after the lock and propagates a newly-manual plan", async () => {
    const stale = project();
    const lockedState = project({ slug: "www" });
    const db = prisma([stale]);
    db.project.findMany.mockReset().mockResolvedValueOnce([stale]).mockResolvedValueOnce([lockedState]);
    const summary = await backfillPublicHosting(db as never, options(true));
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.publicSurfaceHost.create).not.toHaveBeenCalled();
    expect(summary.manualResolutionRequired).toBeGreaterThan(0);
  });

  it("is idempotent on a stateful second apply", async () => {
    const row = project(); const hosts: Array<Record<string, unknown>> = [];
    const client = {
      project: { findMany: vi.fn().mockResolvedValue([row]) },
      publicSurfaceHost: {
        findMany: vi.fn().mockImplementation(async () => hosts),
        create: vi.fn(async ({ data }) => { hosts.push({ id: `host_${hosts.length + 1}`, ...data, retiredAt: null, createdAt: date }); }),
        update: vi.fn(),
      },
      widget: { updateMany: vi.fn() },
      $queryRaw: vi.fn(),
    };
    const db = { ...client, $transaction: vi.fn(async (callback) => callback(client)) };
    const first = await backfillPublicHosting(db as never, options(true));
    row.publicSurfaceHosts = hosts as never;
    const second = await backfillPublicHosting(db as never, options(true));
    expect(first.changed).toBeGreaterThan(0);
    expect(second.changed).toBe(0);
  });

  it("reclassifies a hostname P2002 against refreshed reservations instead of retrying a statement", async () => {
    const row = project(); const reservations: Array<Record<string, unknown>> = [];
    const client = {
      project: { findMany: vi.fn().mockResolvedValue([row]) },
      publicSurfaceHost: {
        findMany: vi.fn().mockImplementation(async () => reservations),
        create: vi.fn(async () => { reservations.push(host({ id: "race", projectId: null, hostname: "acme.forms.semblia.com", status: "DISABLED", retiredAt: date }) as never); throw { code: "P2002", meta: { target: ["hostname"] } }; }),
        update: vi.fn(),
      },
      widget: { updateMany: vi.fn() }, $queryRaw: vi.fn(),
    };
    const db = { ...client, $transaction: vi.fn(async (callback) => callback(client)) };
    const summary = await backfillPublicHosting(db as never, options(true));
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(client.publicSurfaceHost.create).toHaveBeenCalledTimes(1);
    expect(summary.manualResolutionRequired).toBeGreaterThan(0);
  });

  it("does not count or log applied work from a transaction rolled back by a later hostname collision", async () => {
    const db = prisma([project()]); const input = options(true);
    db.publicSurfaceHost.create.mockResolvedValueOnce(undefined).mockRejectedValue({ code: "P2002", meta: { target: ["hostname"] } });
    const summary = await backfillPublicHosting(db as never, input);
    expect(summary.changed).toBe(0);
    expect(input.log.mock.calls.flat().join(" ")).not.toContain("applied-");
  });

  it("parses only explicit apply or dry-run flags", () => {
    expect(parsePublicHostingBackfillArgs([])).toEqual({ apply: false });
    expect(parsePublicHostingBackfillArgs(["--", "--dry-run"])).toEqual({ apply: false });
    expect(parsePublicHostingBackfillArgs(["--dry-run"])).toEqual({ apply: false });
    expect(parsePublicHostingBackfillArgs(["--apply"])).toEqual({ apply: true });
    expect(() => parsePublicHostingBackfillArgs(["--apply", "--dry-run"])).toThrow("Usage");
    expect(() => parsePublicHostingBackfillArgs(["--unsafe"])).toThrow("Usage");
  });
});
