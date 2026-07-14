import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { ZodValidationPipe } from "./common/zod/zod-validation.pipe.js";
import { PrismaService } from "./modules/prisma/prisma.service.js";
import {
  PUBLIC_API_V2_CORS_ALLOWED_HEADERS,
  buildApiV2CorsOptions,
  extractPublicProjectSlugFromPath,
  normalizeOrigin,
} from "./config/security.js";

const PUBLIC_CORS_CACHE_TTL_MS = 60_000;
const PUBLIC_CORS_CACHE_MAX_ENTRIES = 2_000;
const PUBLIC_CORS_ORIGIN_MAX_LENGTH = 2_048;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    rawBody: true,
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix("v2", { exclude: ["health"] });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const publicOriginCache = new Map<
    string,
    { allowed: boolean; expiresAt: number }
  >();

  app.use(createPublicProjectCorsMiddleware(prismaService, publicOriginCache));
  app.enableCors(
    buildApiV2CorsOptions(configService.get<string>("API_V2_CORS_ORIGINS")),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ZodValidationPipe());
  setupOpenApi(app, configService);

  const port = configService.get<number>("API_V2_PORT") ?? 8100;

  await app.listen(port);

  Logger.log(`api_v2 listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();

function setupOpenApi(app: INestApplication, configService: ConfigService) {
  const productionUrl =
    configService.get<string>("API_V2_PUBLIC_BASE_URL") ??
    "https://api.semblia.com";
  const localPort = configService.get<number>("API_V2_PORT") ?? 8100;

  const config = new DocumentBuilder()
    .setTitle("Semblia V2 API")
    .setDescription(
      "Project-scoped Semblia API for collection, responses, forms, widgets, credentials, integrations, exports, webhooks, and agent access.",
    )
    .setVersion("1.0.0")
    .addServer(`${productionUrl}/v2`, "Production API")
    .addServer(`http://localhost:${localPort}/v2`, "Local API")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Clerk session JWT, private API key, or agent key",
        description:
          "Use a Clerk session token for user actions, a semblia_sk_... private API key for scoped private APIs, or a semblia_agent_... key for agent-safe APIs.",
      },
      "semblia-bearer",
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-Semblia-Signature",
        description:
          "HMAC signature for server-side public submission. Format: v1=<hex_hmac_sha256>.",
      },
      "server-submit-signature",
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-Idempotency-Key",
        description:
          "Idempotency key for public submissions and other retryable client operations where documented.",
      },
      "idempotency-key",
    )
    .addTag("Users")
    .addTag("Organizations")
    .addTag("Projects")
    .addTag("Forms")
    .addTag("Widgets")
    .addTag("Responses")
    .addTag("Submissions")
    .addTag("Credentials")
    .addTag("Agent Access")
    .addTag("Outbound Webhooks")
    .addTag("Exports")
    .addTag("Integrations")
    .addTag("Analytics")
    .addTag("Billing")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  app
    .getHttpAdapter()
    .get("/v2/openapi.json", (_request: Request, response: Response) =>
      response.json(document),
    );

  SwaggerModule.setup("v2/openapi", app, document, {
    customSiteTitle: "Semblia V2 API Docs",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

function createPublicProjectCorsMiddleware(
  prismaService: PrismaService,
  cache: Map<string, { allowed: boolean; expiresAt: number }>,
) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const slug = extractPublicProjectSlugFromPath(request.path);
    const origin = request.headers.origin;

    if (!slug || !origin) {
      next();
      return;
    }

    const allowed = await isPublicProjectOriginAllowed(
      prismaService,
      cache,
      slug,
      origin,
    );
    if (!allowed) {
      next();
      return;
    }

    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader(
      "Access-Control-Allow-Headers",
      PUBLIC_API_V2_CORS_ALLOWED_HEADERS.join(","),
    );
    response.setHeader(
      "Access-Control-Max-Age",
      String(Math.floor(PUBLIC_CORS_CACHE_TTL_MS / 1000)),
    );

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  };
}

async function isPublicProjectOriginAllowed(
  prismaService: PrismaService,
  cache: Map<string, { allowed: boolean; expiresAt: number }>,
  slug: string,
  origin: string,
) {
  if (origin.length > PUBLIC_CORS_ORIGIN_MAX_LENGTH) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin.length > PUBLIC_CORS_ORIGIN_MAX_LENGTH) {
    return false;
  }
  const cacheKey = `${slug}\0${normalizedOrigin}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return cached.allowed;
  }

  const allowed = await resolvePublicProjectOrigin(
    prismaService,
    slug,
    normalizedOrigin,
  );
  cache.set(cacheKey, {
    allowed,
    expiresAt: now + PUBLIC_CORS_CACHE_TTL_MS,
  });
  prunePublicOriginCache(cache, now);
  return allowed;
}

function prunePublicOriginCache(
  cache: Map<string, { allowed: boolean; expiresAt: number }>,
  now = Date.now(),
) {
  removeExpiredPublicOriginCacheEntries(cache, now);
  trimPublicOriginCache(cache);
}

function removeExpiredPublicOriginCacheEntries(
  cache: Map<string, { allowed: boolean; expiresAt: number }>,
  now: number,
) {
  for (const [key, value] of cache) {
    if (value.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function trimPublicOriginCache(
  cache: Map<string, { allowed: boolean; expiresAt: number }>,
) {
  while (cache.size > PUBLIC_CORS_CACHE_MAX_ENTRIES) {
    if (!evictOldestPublicOriginCacheEntry(cache)) break;
  }
}

function evictOldestPublicOriginCacheEntry(
  cache: Map<string, { allowed: boolean; expiresAt: number }>,
) {
  const oldestKey = cache.keys().next().value;
  if (oldestKey === undefined) return false;
  return cache.delete(oldestKey);
}

async function resolvePublicProjectOrigin(
  prismaService: PrismaService,
  slug: string,
  origin: string,
) {
  const project = await prismaService.client.project.findUnique({
    where: { slug },
    select: { id: true, allowedOrigins: true },
  });
  if (!project) {
    return false;
  }

  if (project.allowedOrigins.includes(origin)) {
    return true;
  }

  const trustedOrigin =
    await prismaService.client.projectTrustedOrigin.findFirst({
      where: {
        projectId: project.id,
        origin,
        status: "ACTIVE",
      },
      select: { id: true },
    });

  return Boolean(trustedOrigin);
}
