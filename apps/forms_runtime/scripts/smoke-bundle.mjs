/* global clearTimeout, console, fetch, process, setTimeout */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const bundle = resolve(process.argv[2] ?? "dist/local.mjs");
const browserBundle = resolve(process.argv[3] ?? "dist/browser.js");
const lambdaBundle = resolve(process.argv[4] ?? "dist/lambda.mjs");

const browserSource = await readFile(browserBundle, "utf8");
if (
  browserSource.includes("react.dev/link/react-devtools") ||
  browserSource.includes("development build of React")
) {
  throw new Error("Browser bundle contains the React development runtime");
}
await import(pathToFileURL(lambdaBundle).href);

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  if (!port) throw new Error("Unable to reserve a bundle smoke-test port");
  return port;
}

function waitForReady(child) {
  return new Promise((resolveReady, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(
        new Error("Built forms runtime did not become ready within 15 seconds"),
      );
    }, 15_000);
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-2_000);
    });
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("forms_runtime listening")) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Built forms runtime exited before readiness (code ${code})${stderr ? `: ${stderr}` : ""}`,
        ),
      );
    });
  });
}

const port = await findAvailablePort();
const child = spawn(process.execPath, [bundle, "--mock"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    FORMS_RUNTIME_MODE: "mock",
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

try {
  await waitForReady(child);
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    redirect: "manual",
  });
  if (response.status >= 500) {
    throw new Error(
      `Built forms runtime smoke request returned ${response.status}`,
    );
  }
  console.log(`FORMS_RUNTIME_BUNDLE_SMOKE_PASS status=${response.status}`);
} finally {
  child.kill();
}
