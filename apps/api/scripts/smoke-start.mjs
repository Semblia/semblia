import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");

const entrypoint = resolve(appRoot, "dist", "src", "main.js");
/* global clearTimeout, fetch, process, setTimeout */
// eslint-disable-next-line turbo/no-undeclared-env-vars -- smoke uses the configured local port for the public health probe.
const port = process.env.API_V2_PORT ?? "8100";
const healthUrl = `http://127.0.0.1:${port}/health`;
const deadline = Date.now() + 15_000;
const childOutput = [];

const child = spawn("node", [entrypoint], {
  cwd: appRoot,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  childOutput.push(chunk.toString());
});

child.stderr.on("data", (chunk) => {
  childOutput.push(chunk.toString());
});

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

async function stopChild() {
  if (child.exitCode !== null) {
    return;
  }

  child.kill();

  const forcedKill = setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, 2_000);

  await new Promise((resolveExit) => {
    child.once("exit", () => {
      clearTimeout(forcedKill);
      resolveExit();
    });
  });
}

try {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);

      if (response.ok) {
        const body = await response.text();

        process.stdout.write(`${body}\n`);
        process.stdout.write("SMOKE OK\n");
        await stopChild();
        process.exit(0);
      }
    } catch {
      // Retry until deadline while the app boots.
    }

    await delay(250);
  }

  if (childOutput.length > 0) {
    process.stderr.write(childOutput.join(""));
  }
  process.stderr.write("SMOKE FAIL\n");
  await stopChild();
  process.exit(1);
} catch (error) {
  if (childOutput.length > 0) {
    process.stderr.write(childOutput.join(""));
  }
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.stderr.write("SMOKE FAIL\n");
  await stopChild();
  process.exit(1);
}
