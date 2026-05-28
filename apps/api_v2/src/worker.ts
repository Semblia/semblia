import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

const logger = new Logger("TrestaWorker");

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();
  logger.log("Tresta worker started");

  if (process.env.API_V2_WORKER_SMOKE === "true") {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  logger.error("Tresta worker failed to start", error);
  process.exitCode = 1;
});
