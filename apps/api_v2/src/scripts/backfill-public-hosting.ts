import { pathToFileURL } from "node:url";
import { prisma } from "@workspace/database/prisma";
import { backfillPublicHosting } from "../modules/public-surfaces/public-hosting-backfill.js";

export function parsePublicHostingBackfillArgs(argv: string[]) {
  const args = argv.filter((arg) => arg !== "--");
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");
  const unknown = args.filter((arg) => arg !== "--apply" && arg !== "--dry-run");
  if (unknown.length || (apply && dryRun)) {
    throw new Error("Usage: public-hosting:backfill [--apply | --dry-run]");
  }
  return { apply };
}

async function main() {
  const { apply } = parsePublicHostingBackfillArgs(process.argv.slice(2));
  const summary = await backfillPublicHosting(prisma, {
    apply,
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    formsBaseDomain: process.env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN ?? "forms.semblia.com",
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    wallsBaseDomain: process.env.WALLS_PUBLIC_BASE_DOMAIN ?? "walls.semblia.com",
    log: (message) => console.log(message),
  });
  console.log(Object.entries(summary).map(([key, value]) => `${key}=${value}`).join(" "));
  if (summary.manualResolutionRequired > 0) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error: unknown) => {
    void error;
    console.error("public-hosting-backfill failed: database or configuration unavailable");
    process.exitCode = 1;
  }).finally(async () => prisma.$disconnect());
}
