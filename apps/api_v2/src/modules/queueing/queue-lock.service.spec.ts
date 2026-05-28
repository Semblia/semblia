import { describe, expect, it, vi } from "vitest";
import { QueueLockService } from "./queue-lock.service.js";
import type { RedisService } from "../redis/redis.service.js";

function makeService() {
  const redis = {
    set: vi.fn(),
    eval: vi.fn(),
  };
  const service = new QueueLockService({
    redis,
  } as unknown as RedisService);

  return { redis, service };
}

describe("QueueLockService", () => {
  it("runs the task and releases the lock when Redis grants it", async () => {
    const { redis, service } = makeService();
    redis.set.mockResolvedValue("OK");
    redis.eval.mockResolvedValue(1);
    const task = vi.fn().mockResolvedValue("done");

    await expect(service.withLock("locks:test", 5000, task)).resolves.toBe(
      "done",
    );

    expect(redis.set).toHaveBeenCalledWith(
      "locks:test",
      expect.any(String),
      "PX",
      5000,
      "NX",
    );
    expect(task).toHaveBeenCalledOnce();
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call"),
      1,
      "locks:test",
      expect.any(String),
    );
  });

  it("skips the task when another worker owns the lock", async () => {
    const { redis, service } = makeService();
    redis.set.mockResolvedValue(null);
    const task = vi.fn();

    await expect(service.withLock("locks:test", 5000, task)).resolves.toBeNull();

    expect(task).not.toHaveBeenCalled();
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it("releases the lock and rethrows when the task fails", async () => {
    const { redis, service } = makeService();
    redis.set.mockResolvedValue("OK");
    redis.eval.mockResolvedValue(1);

    await expect(
      service.withLock("locks:test", 5000, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(redis.eval).toHaveBeenCalledOnce();
  });

  it("does not fail successful work when lock release fails", async () => {
    const { redis, service } = makeService();
    redis.set.mockResolvedValue("OK");
    redis.eval.mockRejectedValue(new Error("redis down"));

    await expect(
      service.withLock("locks:test", 5000, async () => "done"),
    ).resolves.toBe("done");
  });
});
