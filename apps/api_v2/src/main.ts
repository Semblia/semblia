import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { ZodValidationPipe } from "./common/zod/zod-validation.pipe.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    rawBody: true,
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix("v2", { exclude: ["health"] });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ZodValidationPipe());

  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_V2_PORT") ?? 8100;

  await app.listen(port);

  Logger.log(
    `api_v2 listening on http://localhost:${port}`,
    "Bootstrap",
  );
}

void bootstrap();
