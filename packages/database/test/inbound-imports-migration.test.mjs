import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationsDirectory = new URL("../prisma/migrations/", import.meta.url);
const enumValuesMigration = "20260722000000_inbound_import_enum_values";
const inboundImportsMigration = "20260722010000_inbound_imports";
const importConnectionIdentityMigration =
  "20260722020000_import_connection_resource_identity";

test("inbound import enum values commit before their first use", async () => {
  const [migrations, enumSql, inboundSql, identitySql] = await Promise.all([
    readdir(migrationsDirectory),
    readFile(
      new URL(
        `../prisma/migrations/${enumValuesMigration}/migration.sql`,
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        `../prisma/migrations/${inboundImportsMigration}/migration.sql`,
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        `../prisma/migrations/${importConnectionIdentityMigration}/migration.sql`,
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.ok(migrations.includes(enumValuesMigration));
  assert.ok(enumValuesMigration < inboundImportsMigration);
  assert.ok(inboundImportsMigration < importConnectionIdentityMigration);
  assert.match(
    enumSql,
    /ALTER TYPE "FormResponseTrustMode" ADD VALUE IF NOT EXISTS 'IMPORT';/,
  );
  assert.match(
    enumSql,
    /ALTER TYPE "MediaAssetPurpose" ADD VALUE IF NOT EXISTS 'IMPORT_SOURCE';/,
  );
  assert.doesNotMatch(enumSql, /CREATE TYPE|CREATE TABLE|ADD CONSTRAINT/);
  assert.doesNotMatch(
    inboundSql,
    /ALTER TYPE "(?:FormResponseTrustMode|MediaAssetPurpose)" ADD VALUE/,
  );
  assert.doesNotMatch(
    identitySql,
    /(?:FormResponseTrustMode|MediaAssetPurpose|FormResponseOrigin|ImportMode|ImportJobStatus|ImportItemResult)/,
  );
});

test("inbound imports migration enforces response origin provenance", async () => {
  const sql = await readFile(
    new URL(
      `../prisma/migrations/${inboundImportsMigration}/migration.sql`,
      import.meta.url,
    ),
    "utf8",
  );

  const constraint = sql.match(
    /ADD CONSTRAINT "FormResponse_origin_provenance_check"([\s\S]*?)NOT VALID;/,
  )?.[1];

  assert.ok(constraint);
  for (const fragment of [
    `"origin" = 'FORM'`,
    `"trustMode" IN ('ORIGIN', 'HMAC')`,
    `"origin" = 'IMPORT'`,
    `"trustMode" = 'IMPORT'`,
    `"formId" IS NOT NULL`,
    `"versionId" IS NOT NULL`,
    `"version" IS NOT NULL`,
    `"formId" IS NULL`,
    `"versionId" IS NULL`,
    `"version" IS NULL`,
  ]) {
    assert.match(constraint, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(
    sql,
    /VALIDATE CONSTRAINT "FormResponse_origin_provenance_check"/,
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "ImportJob_one_active_connection_job_key"[\s\S]*?WHERE "connectionId" IS NOT NULL[\s\S]*?"status" IN \('QUEUED'::"ImportJobStatus", 'RUNNING'::"ImportJobStatus", 'FAILED'::"ImportJobStatus"\);/,
  );
});
