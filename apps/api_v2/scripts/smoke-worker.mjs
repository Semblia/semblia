/* global console, process, URL */
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["dist/src/worker.js"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgresql://smoke:smoke@127.0.0.1:1/semblia_worker_smoke",
    REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:1",
    API_V2_WORKER_SMOKE: "true",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Worker smoke exited with signal ${signal}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});
