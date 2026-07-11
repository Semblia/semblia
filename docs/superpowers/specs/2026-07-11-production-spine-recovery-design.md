# Production Spine Recovery Design

**Date:** 2026-07-11

**Status:** Approved by the active goal continuation

## Problem

Semblia's application code is healthy on `main`, but the public production
spine is not. `app.semblia.com` currently returns Vercel
`DEPLOYMENT_NOT_FOUND`; the apex, API, forms, and admin hosts do not currently
resolve. The repository has a production API image, but it starts only the HTTP
process. There is no checked-in production service definition for the required
worker, no executable migration/backup/rollback path, and no post-deploy gate
that proves the application, API, database, Redis, and worker are all healthy.

## Goal

Make the current `main` revision reproducibly deployable as a production spine:

- `apps/web_v2` deploys through an approval-gated Vercel workflow;
- one immutable API image runs the HTTP API, worker, and migration command;
- a production Compose definition explicitly owns API and worker lifecycle;
- preflight validation rejects incomplete production configuration without
  printing secret values;
- deployment takes a database backup before migrations, supports rollback to a
  prior image tag, and runs one post-deploy verification command;
- continuity documents record current external truth and remaining launch
  tracks honestly.

## Safety Boundary

This change creates deployment capability but does not deploy it. The workflow
is manual (`workflow_dispatch`) and uses the protected GitHub `production`
environment. DNS, production data, production secrets, paid providers, email,
and external OAuth configuration remain untouched until the user gives a sober
confirmation.

## Architecture

### Immutable runtime image

The root `Dockerfile` remains the single image definition. The runner contains
the compiled API, compiled worker, generated Prisma client, Prisma migrations,
and the Prisma CLI needed by the one-shot migration service. Compose overrides
the image command for `api`, `worker`, and `migrate`; no separate worker image
is built.

### Production service contract

`deploy/production/compose.yaml` defines:

- `api`: HTTP process, loopback-bound port, public `/health` container check;
- `worker`: queue/cron process with a process-liveness container check;
- `migrate`: one-shot `prisma migrate deploy` command;
- `backup`: one-shot PostgreSQL 17 `pg_dump` command writing timestamped custom
  format backups to a persistent host directory.

PostgreSQL and Redis remain external dependencies addressed by `DATABASE_URL`
and `REDIS_URL`; the deploy file does not invent a production database topology.

### Release orchestration

`deploy/production/deploy.sh` is idempotent and ordered:

1. validate the secret-bearing runtime env file without printing values;
2. pull the requested immutable image tag;
3. create a database backup;
4. run pending migrations;
5. start/update API and worker;
6. execute the post-deploy spine verifier.

Rollback selects the previous immutable image tag and restarts API/worker. It
does not automatically reverse database migrations; destructive rollback uses
the documented backup-restore procedure and requires an explicit maintenance
window.

### Web and API delivery workflow

`.github/workflows/production-release.yml` is manual and protected by the
GitHub `production` environment. It verifies the requested commit, builds and
publishes the API image to GHCR, deploys the prebuilt web app using Vercel's
documented `pull -> build --prod -> deploy --prebuilt --prod` flow, transfers
the checked-in production bundle to the droplet, runs `deploy.sh`, and then
checks the public app/API endpoints. Repository/environment secrets are named
in the runbook, never committed.

### Verification boundary

The Node post-deploy verifier checks three independent facts:

- the app URL returns an acceptable 2xx/3xx response and not a Vercel missing
  deployment response;
- `/health` returns `status: "ok"` with database and Redis both `up`;
- local Compose state reports both `api` and `worker` running and healthy.

Its core is dependency-injected so the network and Compose parsers are covered
by deterministic unit tests. The same command is used by the server-side deploy
script; the GitHub job additionally reruns the public-only checks.

## Environment Contract

The canonical runtime schema remains `apps/api_v2/src/config/env.ts`. A CLI
loads a named env file, invokes the compiled schema, and reports only variable
names and validation messages. `apps/api_v2/.env.example` is synchronized with
every production-required variable, including Razorpay key/secret, the
base64-encoded API encryption key, admin Clerk variables, and forms runtime
signing secret. Email remains disabled by default.

## Failure Handling

- Missing configuration stops before image pull or database access.
- A failed backup stops migrations.
- A failed migration leaves the old API/worker revision running.
- A failed container health check or public smoke exits non-zero and keeps the
  deployment visibly failed.
- Rollback never silently rewinds schema.
- Logs and verifier output redact values; only key names, hosts, service state,
  and HTTP status are printed.

## Verification

The PR gate will include:

- operations unit tests for env parsing, health response validation, Vercel
  missing-deployment detection, and Compose JSON parsing;
- `docker compose config` against a generated no-secret fixture env file;
- production image build;
- API worker bootstrap smoke from the built artifacts;
- repository lint, typecheck, tests, build, and index refresh;
- `git diff --check` and continuity drift checks.

## Deferred Launch Tracks

This spine does not claim the whole August 15 launch is complete. Follow-on
tracks remain: DNS creation, first protected production execution, forms
runtime deployment and Phase-8 form loaders, widget public-host deployment,
admin Clerk bootstrap, provider OAuth setup, transactional email enablement,
and a full authenticated collect-review-publish browser journey.
