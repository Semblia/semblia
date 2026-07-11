import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseEnvText } from "./validate-env.mjs";

const [envPath, key, ...extras] = process.argv.slice(2);

if (!envPath || !key || extras.length > 0) {
  process.stderr.write("Usage: node env-value.mjs <runtime.env> <KEY>\n");
  process.exitCode = 1;
} else {
  const parsed = parseEnvText(await readFile(resolve(envPath), "utf8"));
  process.stdout.write(parsed[key] ?? "");
}
