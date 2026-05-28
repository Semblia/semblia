import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["dist/src/worker.js"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
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
