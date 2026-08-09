import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RedisService } from "../redis/redis.service.js";

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

@Injectable()
export class QueueLockService {
  constructor(@Inject(RedisService) private readonly redisService: RedisService) {}

  async withLock<T>(
    key: string,
    ttlMs: number,
    task: () => Promise<T>,
  ): Promise<T | null> {
    const token = randomUUID();
    const acquired = await this.redisService.redis.set(
      key,
      token,
      "PX",
      ttlMs,
      "NX",
    );

    if (acquired !== "OK") {
      return null;
    }

    try {
      return await task();
    } finally {
      await this.release(key, token);
    }
  }

  private async release(key: string, token: string) {
    try {
      await this.redisService.redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token);
    } catch {
      // The protected task is the source of truth; failed release expires by TTL.
    }
  }
}
