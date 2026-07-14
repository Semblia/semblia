import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "./generated/prisma/index.js";

const DEFAULT_DATABASE_URL =
  "postgresql://appuser:apppassword@localhost:5432/appdb?schema=public";

/** Creates an uncached client for bounded maintenance commands. */
export function createPrismaClient(input?: {
  databaseUrl?: string;
  log?: Array<Prisma.LogLevel | Prisma.LogDefinition>;
}) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        input?.databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    }),
    log: input?.log,
  });
}

/**
 * Shared Prisma client - prevents connection storms
 * Especially important for serverless/edge environments
 * 
 * Uses global caching in development to prevent hot-reload issues
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || createPrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Graceful shutdown - call this on SIGTERM
 * Disconnects from the database and cleans up resources
 */
export async function disconnectPrisma(): Promise<void> {
  console.log('Disconnecting Prisma...');
  await prisma.$disconnect();
  console.log('Prisma disconnected');
}

export * from "./generated/prisma/index.js";
