import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

function parseEnvLine(rawLine, lineNumber) {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const line = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trim()
    : trimmed;
  const separator = line.indexOf("=");

  if (separator <= 0) {
    throw new Error(`invalid environment line ${lineNumber}`);
  }

  const key = line.slice(0, separator).trim();
  if (!ENV_KEY.test(key)) {
    throw new Error(`invalid environment key on line ${lineNumber}`);
  }

  return [key, normalizeEnvValue(line.slice(separator + 1).trim())];
}

function normalizeEnvValue(value) {
  const quote = value[0];
  const quoted = quote === '"' || quote === "'";
  const closingQuote = quoted ? value.indexOf(quote, 1) : -1;

  if (closingQuote > 0) return value.slice(1, closingQuote);
  return value.replace(/\s+#.*$/, "").trimEnd();
}

export function parseEnvText(text) {
  const parsed = {};
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const entry = parseEnvLine(lines[index], index + 1);
    if (entry) parsed[entry[0]] = entry[1];
  }

  return parsed;
}

export function formatValidationError(error, candidate) {
  let message = error instanceof Error ? error.message : String(error);
  const values = [
    ...new Set(
      Object.values(candidate)
        .filter((value) => typeof value === "string" && value.length > 0)
        .sort((left, right) => right.length - left.length),
    ),
  ];

  for (const value of values) {
    message = message.replaceAll(value, "[REDACTED]");
  }

  return message;
}

export function validateProductionEnvironment(parsed, validator) {
  const candidate = { ...parsed, NODE_ENV: "production" };

  try {
    return validator(candidate);
  } catch (error) {
    throw new Error(formatValidationError(error, candidate));
  }
}

async function main() {
  const [envPath, ...extras] = process.argv.slice(2);

  if (!envPath || extras.length > 0) {
    throw new Error(
      "Usage: node scripts/production/validate-env.mjs <runtime.env>",
    );
  }

  const text = await readFile(resolve(envPath), "utf8");
  const parsed = parseEnvText(text);
  const { validateApiV2Env } = await import(
    "../../apps/api_v2/dist/src/config/env.js"
  );

  validateProductionEnvironment(parsed, validateApiV2Env);
  process.stdout.write(
    `Production environment valid (${Object.keys(parsed).length} keys checked)\n`,
  );
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
