import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_V2_PORT") ?? 8100;

  await app.listen(port);

  Logger.log(
    `api_v2 listening on http://localhost:${port}`,
    "Bootstrap",
  );
}

void bootstrap();
