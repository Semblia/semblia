/**
 * Bundles the hosted form client runtime (src/client/runtime.ts) into a
 * minified IIFE and writes src/generated/runtime-js.ts exporting the script
 * string plus its base64 sha256 (used for the CSP `script-src` hash).
 *
 * The generated file is committed so typecheck/test/lint work without a
 * build step; run `pnpm build` (or this script) after editing the runtime.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = buildSync({
  entryPoints: [resolve(pkgRoot, "src/client/runtime.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  write: false,
  legalComments: "none",
});

const file = result.outputFiles[0];
if (!file) throw new Error("esbuild produced no output");

// Inline-script hygiene: the bundle must not be able to close its own tag.
const js = file.text.trim().replaceAll("</script", "<\\/script");

const sha256 = createHash("sha256").update(js, "utf8").digest("base64");

const banner = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: src/client/runtime.ts · Builder: scripts/build-client.mjs
 * Rebuild with: pnpm --filter @workspace/forms-core build
 */
`;

const module_ = `${banner}
/** Minified hosted-form client runtime, inlined into the hosted HTML. */
export const HOSTED_RUNTIME_JS = ${JSON.stringify(js)};

/** Base64 sha256 of the inline script, for CSP \`script-src 'sha256-…'\`. */
export const HOSTED_RUNTIME_SHA256 = ${JSON.stringify(sha256)};
`;

const outPath = resolve(pkgRoot, "src/generated/runtime-js.ts");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, module_, "utf8");
console.log(
  `forms-core client runtime: ${js.length} bytes, sha256-${sha256} → src/generated/runtime-js.ts`,
);
