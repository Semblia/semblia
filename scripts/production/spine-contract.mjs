const VALUE_OPTIONS = new Map([
  ["--app-url", "appUrl"],
  ["--api-url", "apiUrl"],
  ["--compose-file", "composeFile"],
  ["--env-file", "envFile"],
]);

export function assertAppResponse(response) {
  const vercelError = response.headers.get("x-vercel-error");

  if (vercelError === "DEPLOYMENT_NOT_FOUND") {
    throw new Error("app deployment failed: Vercel DEPLOYMENT_NOT_FOUND");
  }

  if (response.status < 200 || response.status >= 400) {
    throw new Error(`app deployment failed: HTTP ${response.status}`);
  }
}

export function assertApiHealth(body) {
  const database = body?.dependencies?.database;
  const redis = body?.dependencies?.redis;
  const healthState = [body?.status, database, redis].join(":");

  if (healthState !== "ok:up:up") {
    throw new Error(
      `api health failed: status=${body?.status ?? "missing"} database=${database ?? "missing"} redis=${redis ?? "missing"}`,
    );
  }
}

export function parseComposePs(output) {
  const records = parseComposeRecords(output);
  const services = new Map(
    records.map((record) => [record.Service ?? record.service, record]),
  );

  for (const name of ["api", "worker"]) {
    assertComposeServiceHealthy(services, name);
  }

  return services;
}

function parseComposeRecords(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("compose health failed: no service state returned");
  }

  const parsed = trimmed.startsWith("[")
    ? JSON.parse(trimmed)
    : trimmed
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
  return Array.isArray(parsed) ? parsed : [parsed];
}

function assertComposeServiceHealthy(services, name) {
  const record = services.get(name);
  const state = record?.State ?? record?.state;
  const health = record?.Health ?? record?.health;

  if ([state, health].join(":") !== "running:healthy") {
    throw new Error(
      `compose health failed: ${name} state=${state ?? "missing"} health=${health ?? "missing"}`,
    );
  }
}

export function parseArguments(argv) {
  const options = {
    appUrl: undefined,
    apiUrl: undefined,
    composeFile: "deploy/production/compose.yaml",
    envFile: "deploy/production/runtime.env",
    publicOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--public-only") {
      options.publicOnly = true;
      continue;
    }

    const option = VALUE_OPTIONS.get(argument);
    if (!option) throw new Error(`unknown option: ${argument}`);

    options[option] = requireOptionValue(argv, index, argument);
    index += 1;
  }

  if (!options.appUrl || !options.apiUrl) {
    throw new Error("--app-url and --api-url are required");
  }

  return options;
}

function requireOptionValue(argv, index, argument) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`missing value for ${argument}`);
  }

  return value;
}
