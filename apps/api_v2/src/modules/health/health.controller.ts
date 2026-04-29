import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle, seconds } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { ClerkService } from "../clerk/clerk.service.js";
import { Public } from "../../common/decorators/public.decorator.js";

@Throttle({ default: { limit: 30, ttl: seconds(60) } })
@Public()
@Controller("health")
export class HealthController {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(RedisService)
    private readonly redisService: RedisService,
    @Inject(ClerkService)
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
