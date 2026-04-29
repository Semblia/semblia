import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { ZodValidationPipe } from "./common/zod/zod-validation.pipe.js";
import { buildApiV2CorsOptions } from "./config/security.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    rawBody: true,
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix("v2", { exclude: ["health"] });

  const configService = app.get(ConfigService);
  app.enableCors(
    buildApiV2CorsOptions(configService.get<string>("API_V2_CORS_ORIGINS")),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ZodValidationPipe());

  const port = configService.get<number>("API_V2_PORT") ?? 8100;

  await app.listen(port);

  Logger.log(`api_v2 listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
