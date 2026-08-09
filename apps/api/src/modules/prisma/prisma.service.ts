import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma } from "@workspace/database/prisma";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  async healthcheck(): Promise<boolean> {
    await this.client.$queryRaw`SELECT 1`;
    return true;
  }
}
