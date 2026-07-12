import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { writeFile } from "node:fs/promises";
import { WorkerModule } from "./worker.module.js";

const logger = new Logger("SembliaWorker");
const HEARTBEAT_INTERVAL_MS = 10_000;

function startWorkerHeartbeat() {
  const heartbeatPath = process.env.WORKER_HEARTBEAT_PATH;
  if (!heartbeatPath) return;

  const pulse = () => {
    void writeFile(heartbeatPath, new Date().toISOString(), "utf8").catch(
      (error: unknown) => logger.error("Worker heartbeat write failed", error),
    );
  };

  pulse();
  setInterval(pulse, HEARTBEAT_INTERVAL_MS).unref();
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();
  startWorkerHeartbeat();
  logger.log("Semblia worker started");

  if (process.env.API_V2_WORKER_SMOKE === "true") {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  logger.error("Semblia worker failed to start", error);
  process.exitCode = 1;
});
