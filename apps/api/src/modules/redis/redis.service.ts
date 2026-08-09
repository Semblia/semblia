import { Inject, Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Redis } from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

@Injectable()
export class RedisService implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get redis(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== "end") {
      await this.client.quit();
    }
  }
}
