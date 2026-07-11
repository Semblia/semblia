import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

test("production Compose defines validator, migrator, API, worker, and backup", () => {
  const compose = read("deploy/production/compose.yaml");

  for (const service of [
    "validate:",
    "migrate:",
    "api:",
    "worker:",
    "backup:",
  ]) {
    assert.match(compose, new RegExp(`^  ${service}`, "m"));
  }

  assert.match(compose, /worker:start/);
  assert.match(compose, /migrate:deploy/);
  assert.match(compose, /pg_dump/);
  assert.match(compose, /validate-env\.mjs/);
  assert.match(compose, /\/run\/config\/runtime\.env:ro/);
  assert.match(compose, /127\.0\.0\.1:\$\{API_HOST_PORT:-8100\}:8000/);
  assert.match(compose, /process\.kill\(1, 0\)/);
});

test("runtime image contains migrations and an API healthcheck", () => {
  const dockerfile = read("Dockerfile");

  assert.match(dockerfile, /packages\/database\/prisma/);
  assert.match(dockerfile, /packages\/database\/prisma\.config\.ts/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /127\.0\.0\.1:\$\{PORT\}\/health/);
  assert.match(dockerfile, /scripts\/production/);

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

test("worker smoke supplies isolated schema-required connection URLs", () => {
  const smoke = read("apps/api_v2/scripts/smoke-worker.mjs");
  const turbo = JSON.parse(read("turbo.json"));

  assert.match(smoke, /NODE_ENV: "test"/);
  assert.match(smoke, /DATABASE_URL:\s*process\.env\.DATABASE_URL \?\?/);
  assert.match(smoke, /REDIS_URL:\s*process\.env\.REDIS_URL \?\?/);
  assert.match(smoke, /127\.0\.0\.1/);
  assert.match(smoke, /API_V2_WORKER_SMOKE: "true"/);
  assert.ok(turbo.globalEnv.includes("DATABASE_URL"));
  assert.ok(turbo.globalEnv.includes("REDIS_URL"));
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
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ]) {
    assert.match(example, new RegExp(`^${key}=`, "m"));
  }

  assert.match(example, /^EMAIL_ENABLED=false$/m);
  assert.match(example, /^MODERATION_AWS_ENABLED=false$/m);

  const ignore = read("deploy/production/.gitignore");
  assert.match(ignore, /^runtime\.env$/m);
  assert.match(ignore, /^backups\/$/m);
});

test("deployment validates before backup and migration, then verifies health", () => {
  const deploy = read("deploy/production/deploy.sh");
  const index = (text) => {
    const position = deploy.indexOf(text);
    assert.notEqual(position, -1, `missing deployment step: ${text}`);
    return position;
  };

  assert.ok(index("compose pull ") < index("run --rm validate"));
  assert.ok(index("run --rm validate") < index("run --rm backup"));
  assert.ok(index("run --rm backup") < index("run --rm migrate"));
  assert.ok(index("run --rm migrate") < index("up -d"));
  assert.ok(index("up -d") < index("scripts/production/spine.mjs"));
});

test("rollback changes only API and worker image state", () => {
  const rollback = read("deploy/production/rollback.sh");

  assert.match(rollback, /ROLLBACK_IMAGE/);
  assert.match(rollback, /pull api worker/);
  assert.match(rollback, /up -d[^\n]*api worker/);
  assert.doesNotMatch(rollback, /migrate|pg_restore|down -v/);
  assert.match(rollback, /schema is not reversed/i);
});

test("production release workflow is manual, protected, and immutable", () => {
  const workflow = read(".github/workflows/production-release.yml");

  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule):/m);
  assert.match(workflow, /environment:\s*production/g);
  assert.match(workflow, /packages:\s*write/);
  assert.match(workflow, /ghcr\.io\/semblia\/semblia-api:\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /docker\/build-push-action@v6/);

  assert.match(workflow, /vercel@55\.0\.0 pull --yes --environment=production/);
  assert.match(workflow, /vercel@55\.0\.0 build --prod/);
  assert.match(workflow, /vercel@55\.0\.0 deploy --prebuilt --prod/);

  assert.match(workflow, /PRODUCTION_SSH_KNOWN_HOSTS/);
  assert.doesNotMatch(workflow, /ssh-keyscan/);
  assert.match(workflow, /scp/);
  assert.match(workflow, /\/opt\/semblia/);
  assert.match(workflow, /deploy\/production\/deploy\.sh/);
  assert.match(workflow, /scripts\/production\/spine\.mjs/);
  assert.match(workflow, /--public-only/);

  assert.doesNotMatch(workflow, /postgres(?:ql)?:\/\/[^$\s]+/i);
  assert.doesNotMatch(workflow, /-----BEGIN (?:OPENSSH|RSA) PRIVATE KEY-----/);
});
