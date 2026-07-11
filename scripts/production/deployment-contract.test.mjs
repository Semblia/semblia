import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("production Compose defines migrator, API, worker, and backup", () => {
  const compose = read("deploy/production/compose.yaml");

  for (const service of ["migrate:", "api:", "worker:", "backup:"]) {
    assert.match(compose, new RegExp(`^  ${service}`, "m"));
  }

  assert.match(compose, /worker:start/);
  assert.match(compose, /migrate:deploy/);
  assert.match(compose, /pg_dump/);
  assert.match(compose, /127\.0\.0\.1:\$\{API_HOST_PORT:-8100\}:8000/);
  assert.match(compose, /process\.kill\(1, 0\)/);
});

test("runtime image contains migrations and an API healthcheck", () => {
  const dockerfile = read("Dockerfile");

  assert.match(dockerfile, /packages\/database\/prisma/);
  assert.match(dockerfile, /packages\/database\/prisma\.config\.ts/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /127\.0\.0\.1:\$\{PORT\}\/health/);

  for (const workspace of [
    "brand-theme",
    "database",
    "forms-core",
    "types",
    "widgets-core",
  ]) {
    assert.match(dockerfile, new RegExp(`packages/${workspace}/dist`));
  }
});

test("database package exposes production migration commands", () => {
  const databasePackage = JSON.parse(read("packages/database/package.json"));

  assert.equal(
    databasePackage.scripts["migrate:deploy"],
    "prisma migrate deploy",
  );
  assert.equal(databasePackage.scripts["migrate:status"], "prisma migrate status");
  assert.ok(databasePackage.dependencies.prisma);
  assert.equal(databasePackage.devDependencies?.prisma, undefined);
});

test("runtime environment template names image, URLs, and every production secret", () => {
  const example = read("deploy/production/runtime.env.example");

  for (const key of [
    "SEMBLIA_IMAGE",
    "APP_URL",
    "API_URL",
    "DATABASE_URL",
    "REDIS_URL",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "ADMIN_CLERK_SECRET_KEY",
    "ADMIN_CLERK_PUBLISHABLE_KEY",
    "ADMIN_CLERK_AUTHORIZED_PARTIES",
    "FORMS_RUNTIME_SIGNING_SECRET",
    "API_V2_SECRET_ENCRYPTION_KEY",
  ]) {
    assert.match(example, new RegExp(`^${key}=`, "m"));
  }

  assert.match(example, /^EMAIL_ENABLED=false$/m);
  assert.match(example, /^MODERATION_AWS_ENABLED=false$/m);

  const ignore = read("deploy/production/.gitignore");
  assert.match(ignore, /^runtime\.env$/m);
  assert.match(ignore, /^backups\/$/m);
});
