import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertApiHealth,
  assertAppResponse,
  parseComposePs,
} from "./spine-health.mjs";
import { parseArguments } from "./spine-cli.mjs";

export { parseArguments } from "./spine-cli.mjs";
export {
  assertApiHealth,
  assertAppResponse,
  parseComposePs,
} from "./spine-health.mjs";

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(fetchImpl, url) {
  return fetchImpl(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
}

function defaultRunCompose(args) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

async function verifyPublicEndpoints(options, fetchImpl) {
  const appResponse = await fetchWithTimeout(fetchImpl, options.appUrl);
  assertAppResponse(appResponse);

  const healthUrl = `${options.apiUrl.replace(/\/$/, "")}/health`;
  const apiResponse = await fetchWithTimeout(fetchImpl, healthUrl);

  if (!apiResponse.ok) {
    throw new Error(`api health failed: HTTP ${apiResponse.status}`);
  }

  const apiHealth = await apiResponse.json();
  assertApiHealth(apiHealth);
  return { appStatus: appResponse.status, apiStatus: apiHealth.status };
}

function verifyComposeServices(options, runCompose) {
  const compose = runCompose([
    "compose",
    "-f",
    options.composeFile,
    "--env-file",
    options.envFile,
    "ps",
    "--format",
    "json",
  ]);
  const succeeded = !compose.error && compose.status === 0;

  if (!succeeded) {
    const detail =
      compose.error?.message ??
      compose.stderr?.trim() ??
      `exit ${compose.status}`;
    throw new Error(`compose health failed: ${detail}`);
  }

  return parseComposePs(compose.stdout);
}

export async function verifyProductionSpine(
  options,
  { fetchImpl = fetch, runCompose = defaultRunCompose } = {},
) {
  const publicStatus = await verifyPublicEndpoints(options, fetchImpl);
  const services = options.publicOnly
    ? undefined
    : verifyComposeServices(options, runCompose);

  return {
    ...publicStatus,
    services,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = await verifyProductionSpine(options);

  process.stdout.write(`app ${options.appUrl}: HTTP ${result.appStatus}\n`);
  process.stdout.write(`api ${options.apiUrl}: ${result.apiStatus}\n`);

  if (result.services) {
    process.stdout.write("compose api: healthy\n");
    process.stdout.write("compose worker: healthy\n");
  }

  process.stdout.write("PRODUCTION SPINE OK\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
