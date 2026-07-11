# Production Spine Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Semblia's web application and API/worker spine reproducibly deployable through an approval-gated, secret-safe, backup-before-migrate workflow with executable post-deploy proof.

**Architecture:** Keep one immutable API image and select API, worker, or migrator behavior by service command. A production Compose contract and idempotent shell orchestrator own backup, migration, rollout, rollback, and local service health; a dependency-injected Node verifier owns public app/API checks and Compose-state parsing. A protected manual GitHub Actions workflow publishes the image, deploys `web_v2` through Vercel's prebuilt flow, transfers the production bundle to the droplet, and invokes the same deploy/verifier path.

**Tech Stack:** Node.js 22, pnpm 11.1.3, Node test runner, Docker/Compose, PostgreSQL 17 client container, Prisma 7, GitHub Actions, GHCR, Vercel CLI, OpenSSH.

---

## Task 1: Post-deploy spine verifier

**Files:**
- Create: `scripts/production/spine.mjs`
- Create: `scripts/production/spine.test.mjs`
- Modify: `package.json`

- [x] **Step 1: Write failing verifier tests**

Create `scripts/production/spine.test.mjs` with Node `test` cases that import
`assertAppResponse`, `assertApiHealth`, and `parseComposePs` from
`./spine.mjs`. Cover:

```js
test("rejects Vercel DEPLOYMENT_NOT_FOUND", async () => {
  const response = new Response("missing", {
    status: 404,
    headers: { "x-vercel-error": "DEPLOYMENT_NOT_FOUND" },
  });
  assert.throws(() => assertAppResponse(response), /DEPLOYMENT_NOT_FOUND/);
});

test("requires database and Redis health", () => {
  assert.throws(
    () => assertApiHealth({
      status: "degraded",
      dependencies: { database: "up", redis: "down" },
    }),
    /redis=down/,
  );
});

test("requires healthy api and worker Compose services", () => {
  const services = parseComposePs([
    JSON.stringify({ Service: "api", State: "running", Health: "healthy" }),
    JSON.stringify({ Service: "worker", State: "running", Health: "healthy" }),
  ].join("\n"));
  assert.deepEqual([...services.keys()].sort(), ["api", "worker"]);
});
```

- [x] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test scripts/production/spine.test.mjs
```

Expected: FAIL because `scripts/production/spine.mjs` does not exist.

- [x] **Step 3: Implement the verifier core and CLI**

Create `scripts/production/spine.mjs` with:

```js
export function assertAppResponse(response) {
  const vercelError = response.headers.get("x-vercel-error");
  if (vercelError === "DEPLOYMENT_NOT_FOUND") {
    throw new Error("app deployment failed: Vercel DEPLOYMENT_NOT_FOUND");
  }
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`app deployment failed: HTTP ${response.status}`);
  }
}

export function assertApiHealth(body) {
  const database = body?.dependencies?.database;
  const redis = body?.dependencies?.redis;
  if (body?.status !== "ok" || database !== "up" || redis !== "up") {
    throw new Error(
      `api health failed: status=${body?.status ?? "missing"} database=${database ?? "missing"} redis=${redis ?? "missing"}`,
    );
  }
}

export function parseComposePs(output) {
  const records = output.trim().startsWith("[")
    ? JSON.parse(output)
    : output.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const services = new Map(records.map((record) => [record.Service, record]));
  for (const name of ["api", "worker"]) {
    const record = services.get(name);
    if (!record || record.State !== "running" || record.Health !== "healthy") {
      throw new Error(
        `compose health failed: ${name} state=${record?.State ?? "missing"} health=${record?.Health ?? "missing"}`,
      );
    }
  }
  return services;
}
```

Add a CLI that accepts `--app-url`, `--api-url`, `--compose-file`,
`--env-file`, and `--public-only`; fetches the app and `${apiUrl}/health` with
10-second abort timeouts; and, unless public-only, runs
`docker compose ... ps --format json`. Print only URLs, HTTP/service state, and
`PRODUCTION SPINE OK`; never print response bodies or environment values.

- [x] **Step 4: Add the operations test command and verify GREEN**

Modify root scripts:

```json
"test:ops": "node --test scripts/production/*.test.mjs",
"test": "pnpm test:ops && pnpm -r --if-present run test",
"smoke:production": "node scripts/production/spine.mjs"
```

Run:

```powershell
pnpm.cmd test:ops
```

Expected: all verifier tests PASS.

- [x] **Step 5: Commit**

```powershell
git add package.json scripts/production
git commit -m "test(deploy): add production spine verifier"
```

## Task 2: Secret-safe production environment preflight

**Files:**
- Create: `scripts/production/validate-env.mjs`
- Create: `scripts/production/validate-env.test.mjs`
- Modify: `apps/api_v2/.env.example`
- Modify: `package.json`

- [x] **Step 1: Write failing CLI tests**

Test `parseEnvText` and `formatValidationError` without importing secret data:

```js
test("parses quoted values without logging them", () => {
  const parsed = parseEnvText('NODE_ENV=production\nSECRET="do not print"\n');
  assert.equal(parsed.NODE_ENV, "production");
  assert.equal(parsed.SECRET, "do not print");
});

test("redacts values from schema failures", () => {
  const message = formatValidationError(
    new Error("DATABASE_URL contained postgres://user:password@example"),
    { DATABASE_URL: "postgres://user:password@example" },
  );
  assert.doesNotMatch(message, /password/);
  assert.match(message, /DATABASE_URL/);
});
```

- [x] **Step 2: Run tests and verify RED**

Run `pnpm.cmd test:ops`.

Expected: FAIL because `validate-env.mjs` does not exist.

- [x] **Step 3: Implement production env validation**

`validate-env.mjs` must:

- parse comments, blank lines, `KEY=value`, and quoted values;
- require a single env-file argument;
- force `NODE_ENV=production` for the validation candidate;
- dynamically import
  `../../apps/api_v2/dist/src/config/env.js` and invoke
  `validateApiV2Env` so the Zod schema remains canonical;
- replace any configured values found in thrown messages with `[REDACTED]`;
- print only `Production environment valid (<count> keys checked)` on success.

Add:

```json
"env:production:check": "node scripts/production/validate-env.mjs"
```

- [x] **Step 4: Synchronize `.env.example`**

Add the production-required names currently missing from
`apps/api_v2/.env.example`:

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
API_V2_SECRET_ENCRYPTION_KEY=
```

Keep `EMAIL_ENABLED=false`; do not add real or sample secret values.

- [x] **Step 5: Verify GREEN and example coverage**

Run:

```powershell
pnpm.cmd test:ops
rg -n "RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET|API_V2_SECRET_ENCRYPTION_KEY" apps/api_v2/.env.example
```

Expected: tests PASS; every required name is present with an empty value.

- [x] **Step 6: Commit**

```powershell
git add package.json apps/api_v2/.env.example scripts/production
git commit -m "feat(deploy): validate production environment safely"
```

## Task 3: Immutable image and explicit production services

**Files:**
- Create: `scripts/production/deployment-contract.test.mjs`
- Create: `deploy/production/compose.yaml`
- Create: `deploy/production/runtime.env.example`
- Modify: `Dockerfile`
- Modify: `packages/database/package.json`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Write the failing deployment-contract test**

Read the source artifacts and assert:

```js
test("production compose defines migrator, api, worker, and backup", () => {
  const compose = read("deploy/production/compose.yaml");
  for (const service of ["migrate:", "api:", "worker:", "backup:"]) {
    assert.match(compose, new RegExp(`^  ${service}`, "m"));
  }
  assert.match(compose, /worker:start/);
  assert.match(compose, /migrate:deploy/);
  assert.match(compose, /pg_dump/);
});

test("runtime image contains migrations and supports all process commands", () => {
  const dockerfile = read("Dockerfile");
  assert.match(dockerfile, /packages\/database\/prisma/);
  assert.match(dockerfile, /HEALTHCHECK/);
  const databasePackage = JSON.parse(read("packages/database/package.json"));
  assert.equal(databasePackage.scripts["migrate:deploy"], "prisma migrate deploy");
  assert.ok(databasePackage.dependencies.prisma);
});
```

- [x] **Step 2: Run tests and verify RED**

Run `pnpm.cmd test:ops`.

Expected: FAIL because the production Compose file and migration command do not
exist.

- [x] **Step 3: Make migrations executable in the runtime image**

Move `prisma` from `devDependencies` to `dependencies` in
`packages/database/package.json` and add:

```json
"migrate:deploy": "prisma migrate deploy",
"migrate:status": "prisma migrate status"
```

Run `pnpm.cmd install --lockfile-only`.

Update the Docker runner to copy `packages/database/prisma` and
`packages/database/prisma.config.ts`, retain the database package scripts, and
add an API healthcheck:

```dockerfile
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" | grep -q '"status":"ok"' || exit 1
```

- [x] **Step 4: Add the production Compose contract**

Create a Compose file using `SEMBLIA_IMAGE` and `runtime.env`:

```yaml
name: semblia-production

x-app: &app
  image: ${SEMBLIA_IMAGE:?set SEMBLIA_IMAGE to an immutable tag}
  env_file: runtime.env
  init: true
  restart: unless-stopped

services:
  migrate:
    <<: *app
    restart: "no"
    command: ["pnpm", "--filter", "@workspace/database", "run", "migrate:deploy"]
    profiles: ["tools"]
  api:
    <<: *app
    command: ["pnpm", "--filter", "api_v2", "run", "start:prod"]
    ports: ["127.0.0.1:${API_HOST_PORT:-8100}:8000"]
    environment: { API_V2_PORT: "8000" }
  worker:
    <<: *app
    command: ["pnpm", "--filter", "api_v2", "run", "worker:start"]
    healthcheck:
      test: ["CMD", "node", "-e", "process.kill(1, 0)"]
      interval: 15s
      timeout: 5s
      retries: 5
  backup:
    image: postgres:17-alpine
    env_file: runtime.env
    profiles: ["tools"]
    volumes: ["./backups:/backups"]
    command: ["/bin/sh", "-c", "pg_dump --format=custom --file=/backups/semblia-$$(date -u +%Y%m%dT%H%M%SZ).dump \"$${DATABASE_URL}\""]
```

Create `runtime.env.example` with every key from the API example plus
`SEMBLIA_IMAGE`, `API_HOST_PORT`, `APP_URL`, and `API_URL`, all secret values
empty and email/provider execution disabled.

- [x] **Step 5: Verify the image and Compose model**

Run:

```powershell
pnpm.cmd test:ops
docker build -t semblia-api:production-spine .
Copy-Item deploy/production/runtime.env.example deploy/production/runtime.env
$env:SEMBLIA_IMAGE='semblia-api:production-spine'
docker compose -f deploy/production/compose.yaml --env-file deploy/production/runtime.env config
Remove-Item deploy/production/runtime.env
```

Expected: tests PASS, image builds, Compose config exits 0, and no env file is
left untracked.

- [x] **Step 6: Commit**

```powershell
git add Dockerfile deploy/production packages/database/package.json pnpm-lock.yaml scripts/production
git commit -m "feat(deploy): define API worker migration services"
```

## Task 4: Backup-first deploy, rollback, and runbook

**Files:**
- Create: `deploy/production/deploy.sh`
- Create: `deploy/production/rollback.sh`
- Create: `deploy/production/README.md`
- Modify: `scripts/production/deployment-contract.test.mjs`

- [x] **Step 1: Extend tests for safe ordering and rollback boundaries**

Assert that `deploy.sh` orders commands by source index:

```js
assert.ok(index("env:production:check") < index(" compose pull "));
assert.ok(index("run --rm backup") < index("run --rm migrate"));
assert.ok(index("run --rm migrate") < index("up -d"));
assert.ok(index("up -d") < index("smoke:production"));
```

Assert `rollback.sh` requires `ROLLBACK_IMAGE`, runs only `api worker`, and does
not contain `migrate`, `restore`, or `down -v`.

- [x] **Step 2: Run tests and verify RED**

Run `pnpm.cmd test:ops`.

Expected: FAIL because deploy/rollback scripts are absent.

- [x] **Step 3: Implement idempotent deployment and rollback**

Both scripts use `set -euo pipefail`, resolve their own directory, and use:

```sh
COMPOSE="docker compose -f $DEPLOY_DIR/compose.yaml --env-file $ENV_FILE"
```

`deploy.sh` requires `SEMBLIA_IMAGE`, `APP_URL`, and `API_URL`; pulls the
immutable image; validates the env inside it; runs backup; runs migrate; starts
API/worker; and invokes:

```sh
node "$REPO_DIR/scripts/production/spine.mjs" \
  --app-url "$APP_URL" \
  --api-url "$API_URL" \
  --compose-file "$DEPLOY_DIR/compose.yaml" \
  --env-file "$ENV_FILE"
```

`rollback.sh` requires `ROLLBACK_IMAGE`, exports it as `SEMBLIA_IMAGE`, pulls
and restarts only API/worker, then runs the same verifier. It prints a warning
that schema is not reversed.

- [x] **Step 4: Write the production runbook**

Document exact prerequisites and commands for:

- protected GitHub `production` environment and required secrets;
- DNS records to create only after the first verified deployment;
- `/opt/semblia/runtime.env` creation and `chmod 600`;
- first deploy, routine deploy, health inspection, logs, and worker smoke;
- backup retention and `pg_restore --clean --if-exists` into a separately
  provisioned recovery database before any destructive restore;
- image rollback and the explicit no-schema-rollback rule;
- failure decision tree and provider/email disabled defaults.

- [x] **Step 5: Verify GREEN and shell syntax**

Run:

```powershell
pnpm.cmd test:ops
git diff --check
```

If `bash` is available, also run `bash -n deploy/production/deploy.sh` and
`bash -n deploy/production/rollback.sh`.

- [x] **Step 6: Commit**

```powershell
git add deploy/production scripts/production
git commit -m "docs(deploy): add backup rollback production runbook"
```

## Task 5: Approval-gated production release workflow

**Files:**
- Create: `.github/workflows/production-release.yml`
- Modify: `scripts/production/deployment-contract.test.mjs`

- [x] **Step 1: Write failing workflow contract tests**

Assert the workflow:

- contains only `workflow_dispatch`;
- uses `environment: production`;
- grants `packages: write` and no broader write permission;
- builds/pushes an immutable SHA-tagged GHCR image;
- runs `vercel pull --environment=production`, `vercel build --prod`, and
  `vercel deploy --prebuilt --prod`;
- uses OpenSSH/scp to `/opt/semblia` and invokes `deploy.sh`;
- runs the public-only post-deploy verifier;
- never embeds a token, key, database URL, or private key literal.

- [x] **Step 2: Run tests and verify RED**

Run `pnpm.cmd test:ops`.

Expected: FAIL because the workflow is absent.

- [x] **Step 3: Implement the manual protected workflow**

Create jobs:

1. `verify`: checkout, pnpm 11.1.3/Node 22 setup, frozen install, Prisma
   generate, `pnpm validate:release`, `pnpm test:ops`.
2. `publish-api-image`: log in to GHCR with `GITHUB_TOKEN`, build and push
   `ghcr.io/${{ github.repository_owner }}/semblia-api:${{ github.sha }}`.
3. `deploy-web`: set `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from protected
   secrets, install Vercel CLI, then run the documented pull/build/deploy flow.
4. `deploy-api-worker`: write the protected SSH key and an out-of-band pinned
   `known_hosts` value to 0600 files, copy `deploy/production` plus
   `scripts/production` to `/opt/semblia`, and run `deploy.sh` with the
   immutable image tag. Do not use trust-on-first-use `ssh-keyscan`.
5. `verify-public`: run `spine.mjs --public-only` against
   `https://app.semblia.com` and `https://api.semblia.com`.

Every mutating job uses `environment: production`; concurrency is
`production-release` with cancellation disabled.

- [x] **Step 4: Verify workflow contract and YAML shape**

Run `pnpm.cmd test:ops` and inspect the rendered file with
`Get-Content .github/workflows/production-release.yml`.

Expected: contract tests PASS and no secret values are present.

- [x] **Step 5: Commit**

```powershell
git add .github/workflows/production-release.yml scripts/production/deployment-contract.test.mjs
git commit -m "ci(deploy): add protected production release workflow"
```

## Task 6: Continuity reconciliation, full verification, and PR

**Files:**
- Modify: `docs/continuity/progress.md`
- Modify: `docs/continuity/open-questions.md`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-11-production-spine-recovery.md`

- [x] **Step 1: Reconcile external truth and completed code state**

Update the current snapshot to record:

- clean `main` merge `79dd7af8` and no open PRs at discovery time;
- live domain failures and timestamped probe evidence;
- current server-backed widget draft/publish state (remove the stale pending
  claim);
- current `FormResponse` architecture instead of removed
  `CollectionFormSubmission` operational text;
- the production spine artifacts created by this plan and the fact that first
  execution/DNS remain user-approved external work;
- Phase-8 form embed and public widget/form host deployment as launch blockers.

Update root README deployment pointers to the real runbook.

- [x] **Step 2: Mark completed plan checkboxes and self-review**

Replace each completed `- [ ]` with `- [x]`. Run:

```powershell
Select-String -Path docs/superpowers/plans/2026-07-11-production-spine-recovery.md -Pattern ('T'+'BD'),('T'+'ODO'),('F'+'IXME'),('implement'+' later'),('appropriate'+' error')
```

Expected: no plan placeholders.

- [x] **Step 3: Run source/index gates**

```powershell
python scripts/update-indexes.py
git diff --check
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd --filter api_v2 smoke:worker
```

Expected: every command exits 0; report exact test counts from output.

- [x] **Step 4: Run deployment gates**

```powershell
pnpm.cmd test:ops
docker build -t semblia-api:production-spine .
```

Generate a temporary no-secret fixture that satisfies the schema, run
`docker compose config`, then delete the fixture. Start local PostgreSQL/Redis
from the existing development Compose file and run the built image's worker
smoke. Do not contact production services or external providers.

- [x] **Step 5: Commit continuity closeout**

```powershell
git add README.md docs/continuity docs/superpowers/plans scripts/index-data graphify-out
git commit -m "docs(continuity): record production spine recovery"
```

- [x] **Step 6: Push, open PR, and verify hosted state**

```powershell
git push -u origin codex/production-spine-recovery
gh pr create --base main --head codex/production-spine-recovery \
  --title "Build a reproducible Semblia production spine" \
  --body-file <prepared-pr-body>
gh pr checks --watch
```

Expected: PR opens, hosted checks are green, and mergeability is `CLEAN` on the
latest head. Do not dispatch `production-release.yml`.
