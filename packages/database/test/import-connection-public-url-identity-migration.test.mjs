import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = "20260726000000_import_connection_public_url_identity";

test("public URL import connections have a scoped durable uniqueness invariant", async () => {
  const [sql, schema] = await Promise.all([
    readFile(
      new URL(
        `../prisma/migrations/${migration}/migration.sql`,
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
  ]);

  const predicate =
    '"authStrategy" = \'PUBLIC_URL\'::"ImportConnectionAuthStrategy" AND "publicUrl" IS NOT NULL';

  assert.match(
    sql,
    /CREATE UNIQUE INDEX "ImportConnection_public_url_identity_key"[\s\S]*?ON "ImportConnection"\("projectId", "sourceKey", "publicUrl"\)[\s\S]*?WHERE "authStrategy" = 'PUBLIC_URL'::"ImportConnectionAuthStrategy"[\s\S]*?AND "publicUrl" IS NOT NULL;/,
  );
  // CONCURRENTLY is rejected inside Prisma's migration transaction — its
  // presence here would abort the first production `migrate deploy`. Comment
  // lines are allowed to mention it; statements are not.
  const statements = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(statements, /CONCURRENTLY/);
  assert.match(
    schema,
    new RegExp(
      `@@unique\\(\\[projectId, sourceKey, publicUrl\\], map: "ImportConnection_public_url_identity_key", where: raw\\(${JSON.stringify(predicate).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)\\)`,
    ),
  );
  assert.match(
    schema,
    /@@unique\(\[projectId, sourceKey, externalAccountId\]\)/,
  );
});
