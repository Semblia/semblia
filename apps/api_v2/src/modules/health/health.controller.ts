import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { ClerkService } from "../clerk/clerk.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly clerkService: ClerkService,
  ) {}

  @Get()
  async getHealth() {
    const [database, redis] = await Promise.all([
      this.prismaService
        .healthcheck()
        .then(() => "up")
        .catch(() => "down"),
      this.redisService
        .ping()
        .then(() => "up")
        .catch(() => "down"),
    ]);

    return {
      status: database === "up" && redis === "up" ? "ok" : "degraded",
      service: "tresta-api-v2",
      port: this.configService.get<number>("API_V2_PORT") ?? 8100,
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        redis,
        clerkConfigured: this.clerkService.isConfigured(),
      },
    };
  }
}
