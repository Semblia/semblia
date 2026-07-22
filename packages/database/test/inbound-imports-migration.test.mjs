import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("inbound imports migration enforces response origin provenance", async () => {
  const sql = await readFile(
    new URL(
      "../prisma/migrations/20260722010000_inbound_imports/migration.sql",
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
