import { pathToFileURL } from "node:url";
import { prisma } from "@workspace/database/prisma";
import { backfillFormsV4Configs } from "../src/modules/forms/forms-v4-config.js";

function parseBackfillFormsV4Args(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const unknown = argv.filter((arg) => arg !== "--dry-run");
  if (unknown.length > 0) {
    throw new Error(`Unknown flags: ${unknown.join(", ")}`);
  }

  return { dryRun };
}

async function main() {
  const args = parseBackfillFormsV4Args(process.argv.slice(2));
  const summary = await backfillFormsV4Configs(prisma, {
    dryRun: args.dryRun,
    log: (message) => console.log(message),
  });

  console.log(
    `forms v4 backfill scanned=${summary.scanned} skipped=${summary.skipped} updated=${summary.updated} failed=${summary.failed}`,
  );

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
