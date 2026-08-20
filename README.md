# Semblia

Semblia is a TypeScript monorepo for collecting, moderating, exporting, and displaying customer feedback/testimonials. The current repo line is v2-only: the legacy `apps/api`, `apps/web`, and `packages/widget` codepaths were removed in `8e1f1a4`.

## Current Workspaces

| Workspace | Purpose |
| --- | --- |
| `apps/api` | NestJS API, admin routes, billing/webhooks, workers, queues, and OpenAPI. |
| `apps/app` | Next.js product app. |
| `apps/admin` | Next.js admin/ops app for `admin.semblia.com`. |
| `apps/forms` | Hono hosted-forms runtime for public collection pages. |
| `packages/database` | Prisma schema, generated client, migrations, and DB exports. |
| `packages/types` | Shared DTO/type contracts. |
| `packages/forms-core` | Shared hosted-form normalization, rendering, and view models. |
| `packages/semblia-mcp-server` | Official local MCP adapter over scoped private APIs. |

## Source Of Truth

Fresh sessions should start with:

1. `AGENTS.md`
2. `docs/continuity/README.md`
3. `docs/continuity/progress.md`
4. `docs/continuity/decisions.md`
5. `docs/continuity/open-questions.md`

Those files are the live handoff surface. Older plans and orchestration docs are supporting evidence only.

## Tooling

- Node: `>=20`
- Package manager: `pnpm@11.1.3`
- Repo package-manager settings live in `pnpm-workspace.yaml`.
- On Windows, verify `pnpm.cmd --version` reports the pinned `11.1.3` before
  running gates. Do not substitute `corepack.cmd pnpm` unless it reports the
  same version; some Corepack installations resolve a different global pnpm.

Install dependencies:

```bash
pnpm install
```

## Common Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Focused workspace commands:

```bash
pnpm build --filter api
pnpm --filter api test
pnpm --filter api lint
pnpm --filter api typecheck

pnpm build --filter app
cd apps/app && pnpm exec tsc --noEmit
cd apps/app && pnpm exec eslint . --ext .ts,.tsx

pnpm --filter forms dev
pnpm --filter forms cdk synth -c formsRuntimeMode=mock
pnpm --filter forms run synth:check
```

After modifying source under `apps/app`, `apps/api`, or `packages`, refresh the indexes:

```bash
python scripts/update-indexes.py
```

## Runtime Shape

- Product/client apps deploy through Vercel.
- `apps/api` and its worker run as separate processes/containers.
- The current low-cost hosting direction is one DigitalOcean droplet for API/worker runtime.
- Hosted forms use `apps/forms` plus `packages/forms-core`; `api` remains the canonical source of truth for project resolution, trust validation, submissions, analytics, notifications, and worker fanout.

## Documentation

- Continuity: `docs/continuity/`
- API contract docs: `docs/api/`
- Implementation plans: `docs/plans/`
- Admin setup: `apps/admin/README.md`
- Production API/worker release, backup, rollback, and smoke runbook: `deploy/production/README.md`
- Forms runtime deployment notes: `apps/forms/deploy/`
- Public forms/walls activation (approval-gated only):
  `deploy/production/public-surface-hosting.md`
- Database schema: `packages/database/prisma/schema.prisma`
