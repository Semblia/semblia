import { RequestMethod } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { HealthController } from "./health.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const DEFAULT_THROTTLER_LIMIT_METADATA = "THROTTLER:LIMITdefault";
const DEFAULT_THROTTLER_TTL_METADATA = "THROTTLER:TTLdefault";

describe("HealthController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("declares a public throttled GET /health route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe("health");
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController)).toBe(true);
    expect(
      Reflect.getMetadata(PATH_METADATA, HealthController.prototype.getHealth),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.getHealth),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(DEFAULT_THROTTLER_LIMIT_METADATA, HealthController),
    ).toBe(30);
    expect(
      Reflect.getMetadata(DEFAULT_THROTTLER_TTL_METADATA, HealthController),
    ).toBe(60000);
  });

  it("reports ok only when required dependencies are up", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
    const controller = new HealthController(
      { get: vi.fn().mockReturnValue(8100) } as never,
      { healthcheck: vi.fn().mockResolvedValue(undefined) } as never,
      { ping: vi.fn().mockResolvedValue("PONG") } as never,
      { isConfigured: vi.fn().mockReturnValue(true) } as never,
    );

    await expect(controller.getHealth()).resolves.toEqual({
      status: "ok",
      service: "semblia-api-v2",
      port: 8100,
      timestamp: "2026-06-30T12:00:00.000Z",
      dependencies: {
        database: "up",
        redis: "up",
        clerkConfigured: true,
      },
    });
  });

  it("reports degraded when a required dependency check fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
    const controller = new HealthController(
      { get: vi.fn().mockReturnValue(undefined) } as never,
      { healthcheck: vi.fn().mockRejectedValue(new Error("db down")) } as never,
      { ping: vi.fn().mockResolvedValue("PONG") } as never,
      { isConfigured: vi.fn().mockReturnValue(false) } as never,
    );

    await expect(controller.getHealth()).resolves.toEqual({
      status: "degraded",
      service: "semblia-api-v2",
      port: 8100,
      timestamp: "2026-06-30T12:00:00.000Z",
      dependencies: {
        database: "down",
        redis: "up",
        clerkConfigured: false,
      },
    });
  });
});
