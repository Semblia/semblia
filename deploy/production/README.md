# Semblia production spine runbook

**The ordered first-deploy sequence lives in
[`first-deploy-runbook.md`](first-deploy-runbook.md)** — start there. This
file is the spine's mechanical reference: `app` on Vercel and the API plus
worker on the production Docker host. Hosted forms, public widget hosts,
admin bootstrap, provider OAuth, email enablement, and DNS changes are
separate launch tracks sequenced by the first-deploy runbook.

Public forms/walls hosting keeps its approval-gated detail in
[`public-surface-hosting.md`](public-surface-hosting.md). It is an activation
plan only; it makes no CloudFront, ACM, Cloudflare, Vercel, DNS, or
database-contract changes.

## Safety boundary

The checked-in workflow is manual and must be protected by a GitHub environment
named `production` with a required reviewer. Do not dispatch it, change DNS,
restore a database, enable email, or enable paid provider work without explicit
user approval.

Secrets belong in GitHub environment secrets and `/opt/semblia/runtime.env`.
They must never appear in Git, workflow inputs, shell history, issue text, or
logs. The preflight prints key names and validation errors only.

## Host prerequisites

- Linux host with Docker Engine and Docker Compose v2
- Node.js 22 for the post-deploy verifier
- outbound HTTPS access to GHCR, the configured PostgreSQL server, Redis, the
  public app URL, and the public API URL
- `/opt/semblia` owned by the deployment user
- a reverse proxy or tunnel forwarding `api.semblia.com` to
  `127.0.0.1:8100`; TLS terminates before the loopback-only API port

PostgreSQL and Redis are intentionally external to the production Compose file.
Their topology, retention, failover, and access controls remain infrastructure
decisions rather than accidental side effects of an application rollout.

## GitHub production environment

Create a protected `production` environment with these secrets:

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel team/account id |
| `VERCEL_WEB_V2_PROJECT_ID` | Vercel project bound to `apps/app` |
| `PRODUCTION_SSH_HOST` | API/worker host |
| `PRODUCTION_SSH_USER` | least-privilege deployment user |
| `PRODUCTION_SSH_PRIVATE_KEY` | dedicated deployment key |
| `PRODUCTION_SSH_KNOWN_HOSTS` | pinned host key gathered through a trusted out-of-band channel |
| `WIDGETS_AWS_ACCESS_KEY_ID` | least-privilege key for the widgets CDN publish (S3 put + CloudFront invalidation only) |
| `WIDGETS_AWS_SECRET_ACCESS_KEY` | secret for the key above |
| `WIDGETS_EMBED_BUCKET` | S3 bucket name from the deployed `SembliaWidgetsCdnStack` output |
| `WIDGETS_CDN_DISTRIBUTION_ID` | CloudFront distribution id from the same stack output |

Set a required reviewer and disable self-approval if the GitHub plan permits.
The workflow deliberately has no scheduled, push, or pull-request trigger.

## First host setup

Copy the template once, then populate values directly on the host:

```sh
sudo install -d -m 0750 -o "$USER" -g "$USER" /opt/semblia
cp deploy/production/runtime.env.example /opt/semblia/runtime.env
chmod 0600 /opt/semblia/runtime.env
```

Required values are enforced by `apps/api/src/config/env.ts`. Any value
containing a dollar sign must be single-quoted (`SECRET='p$ss'`) — compose's
env-file parser expands `$VAR` in unquoted and double-quoted values, and the
preflight validator rejects the ambiguous forms before anything deploys.

Launch switches: `MODERATION_AWS_ENABLED` stays `false` until separately
approved. `EMAIL_ENABLED` was approved (2026-08-09) to flip `true` from the
staging rehearsal onward — conditional on the Resend domain being verified,
`EMAIL_FROM`/`EMAIL_REPLY_TO` chosen, the daily quota configured, and
`EMAIL_UNSUBSCRIBE_SECRET` + `API_PUBLIC_URL` populated.

Use an immutable image tag such as a full Git commit SHA. Never use `latest`.

## Preflight without deployment

From the checked-out release commit:

```sh
docker build -t semblia-api:preflight .
docker run --rm \
  --env-file /opt/semblia/runtime.env \
  -v /opt/semblia/runtime.env:/run/config/runtime.env:ro \
  semblia-api:preflight \
  node scripts/production/validate-env.mjs /run/config/runtime.env
```

The command must end with `Production environment valid`. It does not connect
to the database or providers.

## Deployment order

Workflow-level ordering (`production-release.yml`): the app is **staged** on
Vercel first (`deploy --prebuilt --prod --skip-domain` — built, uploaded, but
not serving the production domains), then the API image and migrations deploy
on the host, and only then does `promote-web` point the production domains at
the staged deployment. New web never serves live traffic against the old API
or schema, and a failed API deploy leaves the old web untouched.

`deploy.sh` is the only normal server-side entrypoint. It pulls the immutable
image, validates configuration, creates a PostgreSQL custom-format backup,
applies pending Prisma migrations, updates API and worker, and runs the public
plus local health verifier.

```sh
cd /opt/semblia
ENV_FILE=/opt/semblia/runtime.env ./deploy/production/deploy.sh
```

A successful run ends with `PRODUCTION SPINE OK`. A backup or migration failure
stops before the new API/worker revision is started.

## Routine inspection

```sh
docker compose \
  -f /opt/semblia/deploy/production/compose.yaml \
  --env-file /opt/semblia/runtime.env \
  ps

docker compose \
  -f /opt/semblia/deploy/production/compose.yaml \
  --env-file /opt/semblia/runtime.env \
  logs --tail=200 api worker

node /opt/semblia/scripts/production/spine.mjs \
  --app-url https://app.semblia.com \
  --api-url https://api.semblia.com \
  --compose-file /opt/semblia/deploy/production/compose.yaml \
  --env-file /opt/semblia/runtime.env
```

Do not run `docker compose config` without `--quiet` against the real env file;
normal rendered output expands secrets. Safe syntax validation is:

```sh
docker compose \
  -f /opt/semblia/deploy/production/compose.yaml \
  --env-file /opt/semblia/runtime.env \
  config --quiet
```

## Backup and recovery

Every deployment creates `deploy/production/backups/semblia-<UTC>.dump` before
schema changes. Copy backups to encrypted off-host storage and retain at least:

- 7 daily backups
- 4 weekly backups
- the last backup before every schema-changing release

Test restore into a separately provisioned recovery database first:

```sh
export RECOVERY_DATABASE_URL='postgresql://recovery-user:replace-me@recovery-host:5432/semblia_recovery'
docker run --rm \
  -v /opt/semblia/deploy/production/backups:/backups:ro \
  postgres:17-alpine \
  pg_restore --clean --if-exists --no-owner \
  --dbname "$RECOVERY_DATABASE_URL" \
  /backups/semblia-YYYYMMDDTHHMMSSZ.dump
```

Never point the first restore attempt at production. A destructive production
restore requires a maintenance window, stopped API/worker services, a freshly
verified backup, and explicit user approval.

## Application rollback

Select the prior full-SHA image tag:

```sh
cd /opt/semblia
ROLLBACK_IMAGE=ghcr.io/semblia/semblia-api:<prior-full-sha> \
  ENV_FILE=/opt/semblia/runtime.env \
  ./deploy/production/rollback.sh
```

This changes only API and worker image state. It intentionally does not reverse
database schema. If an older binary cannot operate on the current schema, keep
the current binary running and use the separately approved recovery procedure.

Rollback does not depend on registry access: the workflow's GHCR login is an
ephemeral `GITHUB_TOKEN`, so `rollback.sh` tolerates a failed pull and
`pull_policy: missing` starts the previously pulled image from the local
cache. Any image ever deployed from this host is rollback-eligible offline.
To roll back to an image this host never pulled, `docker login ghcr.io` with a
durable least-privilege credential (fine-grained PAT, `read:packages` only,
stored like every other host secret) before running the script.

Web rollback: re-run the promote command with the previous release's staged
deployment URL (shown in that run's `deploy-web` job output):

```sh
vercel promote <previous-deployment-url> --yes --token=<VERCEL_TOKEN>
```

## Failure decision tree

1. **Image pull fails:** leave current services running; fix registry auth or
   the immutable tag.
2. **Environment validation fails:** correct only the named key; values are not
   logged.
3. **Backup fails:** stop. Do not run schema changes.
4. **Schema application fails:** current services remain on the old image;
   inspect Prisma output and the backup before retrying.
5. **API health fails:** inspect API logs and `/health`; do not create DNS.
6. **Worker health fails:** inspect worker logs and Redis reachability; queues
   must not be considered operational.
7. **Public verifier fails:** keep the release failed even if containers are
   running; correct routing, TLS, Vercel binding, or DNS before launch.

## First-run DNS approval gate

This repository change does not alter DNS. The canonical-URL verifier cannot
pass until the user separately approves the first-run bindings. Immediately
before the first protected workflow dispatch, and only with that approval:

- `app.semblia.com` -> the verified Vercel project
- `api.semblia.com` -> the verified API ingress/reverse proxy

Use a short TTL during the first cutover, confirm both names resolve from an
independent resolver, then dispatch the protected workflow. The run remains
failed until both canonical URLs pass. Raise the TTL only after the workflow
and server-side verifier succeed.

`forms.semblia.com`, `admin.semblia.com`, and the apex are not covered by this
spine rollout and must not be implied healthy by this gate.
`widgets.semblia.com` is *published* by this workflow's
`publish-widgets-embed` job (S3 upload + invalidation), but its serving
health is proven by the public-surface-hosting runbook, not by this gate —
the spine verifier does not probe it.
