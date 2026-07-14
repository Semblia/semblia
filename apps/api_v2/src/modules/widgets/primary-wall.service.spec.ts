import { Prisma, WidgetType } from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import {
  isEligiblePrimaryWall,
  PrimaryWallService,
} from "./primary-wall.service.js";

describe("PrimaryWallService", () => {
  it("recognizes only active, published walls with a slug as eligible", () => {
    expect(
      isEligiblePrimaryWall({
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        wallSlug: "proof-wall",
        publishedSnapshot: {},
      }),
    ).toBe(true);
    expect(
      isEligiblePrimaryWall({
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        wallSlug: "proof-wall",
        publishedSnapshot: Prisma.DbNull,
      } as never),
    ).toBe(false);
  });

  it("locks the project with a parameterized row-lock query", async () => {
    const $queryRaw = vi.fn().mockResolvedValue([]);
    const service = new PrimaryWallService();

    await service.lockProject({ $queryRaw } as never, "project_1");

    expect($queryRaw).toHaveBeenCalledTimes(1);
    const query = $queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    expect(query.join("?")).toContain('WHERE "id" = ?');
    expect(query.join("?")).toContain("FOR UPDATE");
    expect($queryRaw.mock.calls[0]?.slice(1)).toEqual(["project_1"]);
  });

  it("preserves an eligible primary and otherwise promotes the earliest eligible wall", async () => {
    const widget = {
      findMany: vi
        .fn()
        .mockResolvedValueOnce([
          { id: "wall_later", isPrimaryWall: true },
          { id: "wall_first", isPrimaryWall: false },
        ])
        .mockResolvedValueOnce([{ id: "wall_later" }])
        .mockResolvedValueOnce([
          { id: "wall_first", isPrimaryWall: false },
          { id: "wall_later", isPrimaryWall: false },
        ])
        .mockResolvedValueOnce([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const service = new PrimaryWallService();

    await expect(
      service.maintainPrimaryWall({ widget } as never, "project_1"),
    ).resolves.toBe("wall_later");
    await expect(
      service.maintainPrimaryWall({ widget } as never, "project_1"),
    ).resolves.toBe("wall_first");

    expect(widget.updateMany).toHaveBeenLastCalledWith({
      where: { id: "wall_first", isPrimaryWall: { not: true } },
      data: { isPrimaryWall: true },
    });
  });

  it("repairs duplicate primaries by retaining the earliest eligible primary", async () => {
    const widget = {
      findMany: vi
        .fn()
        .mockResolvedValueOnce([
          { id: "wall_first", isPrimaryWall: true },
          { id: "wall_second", isPrimaryWall: true },
        ])
        .mockResolvedValueOnce([{ id: "wall_first" }, { id: "wall_second" }]),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
    };

    await expect(
      new PrimaryWallService().maintainPrimaryWall(
        { widget } as never,
        "project_1",
      ),
    ).resolves.toBe("wall_first");
    expect(widget.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["wall_second"] } },
      data: { isPrimaryWall: false },
    });
  });

  it("leaves a project with no primary when no eligible walls remain", async () => {
    const widget = {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    await expect(
      new PrimaryWallService().maintainPrimaryWall(
        { widget } as never,
        "project_1",
      ),
    ).resolves.toBeNull();
    expect(widget.updateMany).not.toHaveBeenCalled();
  });
});
