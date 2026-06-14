import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const BUDGET_GZIP_BYTES = 3 * 1024;

const shared = {
  entryPoints: ["src/loader.ts"],
  bundle: true,
  minify: true,
  target: ["es2022"],
  legalComments: "none",
};

await build({ ...shared, format: "iife", outfile: "dist/embed.js" });
await build({ ...shared, format: "esm", outfile: "dist/embed.esm.js" });

const bundle = readFileSync("dist/embed.js");
const gzipped = gzipSync(bundle, { level: 9 }).byteLength;

console.log(
  `widgets embed.js: ${bundle.byteLength} B raw, ${gzipped} B gzipped (budget ${BUDGET_GZIP_BYTES} B)`,
);

if (gzipped > BUDGET_GZIP_BYTES) {
  console.error(
    `\nDELIVERY BUDGET EXCEEDED: widgets embed.js is ${gzipped} B gzipped, ` +
      `budget is ${BUDGET_GZIP_BYTES} B.`,
  );
  process.exit(1);
}
