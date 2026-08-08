// Reconciles _prisma_migrations checksums with the migration files on disk.
//
// When an applied migration file is edited (the 2026-07-26 inbound-imports
// cleanup), every database that already ran it stores a stale checksum and
// `prisma migrate dev` demands a full reset. The repair is Prisma's own
// documented one: update the stored checksum to the current file's sha256.
// This never rewrites migration files and never touches unapplied rows.
//
// Dry-run by default; pass --write to apply. Uses DATABASE_URL (or the
// package .env, like the prisma CLI does).
import "dotenv/config";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "../dist/prisma.js";

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "prisma",
  "migrations",
);
const write = process.argv.includes("--write");

const expected = new Map();
for (const name of readdirSync(migrationsDir)) {
  const file = path.join(migrationsDir, name, "migration.sql");
  try {
    if (!statSync(path.join(migrationsDir, name)).isDirectory()) continue;
  } catch {
    continue;
  }
  const sql = readFileSync(file);
  expected.set(name, createHash("sha256").update(sql).digest("hex"));
}

const prisma = createPrismaClient({ log: ["warn", "error"] });
try {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT migration_name, checksum FROM "_prisma_migrations"',
  );
  let drifted = 0;
  for (const row of rows) {
    const target = expected.get(row.migration_name);
    if (!target || target === row.checksum) continue;
    drifted += 1;
    console.log(
      `${write ? "REPAIR" : "DRIFT"} ${row.migration_name}\n  stored ${row.checksum}\n  file   ${target}`,
    );
    if (write) {
      await prisma.$executeRaw`UPDATE "_prisma_migrations" SET checksum = ${target} WHERE migration_name = ${row.migration_name}`;
    }
  }
  if (drifted === 0) console.log("No checksum drift.");
  else if (!write) console.log("Dry run only — re-run with --write to repair.");
  else console.log(`Repaired ${drifted} row(s).`);
} finally {
  await prisma.$disconnect();
}
