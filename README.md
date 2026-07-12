# Semblia

Semblia is a TypeScript monorepo for collecting, moderating, exporting, and displaying customer feedback/testimonials. The current repo line is v2-only: the legacy `apps/api`, `apps/web`, and `packages/widget` codepaths were removed in `8e1f1a4`.

## Current Workspaces

| Workspace | Purpose |
| --- | --- |
| `apps/api_v2` | NestJS API, admin routes, billing/webhooks, workers, queues, and OpenAPI. |
| `apps/web_v2` | Next.js product app. |
| `apps/admin` | Next.js admin/ops app for `admin.semblia.com`. |
| `apps/forms_runtime` | Hono hosted-forms runtime for public collection pages. |
| `packages/database` | Prisma schema, generated client, migrations, and DB exports. |
| `packages/types` | Shared DTO/type contracts. |
| `packages/forms-core` | Shared hosted-form normalization, rendering, and view models. |
| `packages/ui` | Shared UI primitives and global styles. |
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
- Prefer `corepack.cmd pnpm ...` on Windows when a command must honor the pinned pnpm version.

Install dependencies:

```bash
corepack.cmd pnpm install
```

## Common Commands

```bash
corepack.cmd pnpm dev
corepack.cmd pnpm build
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
```

Focused workspace commands:

```bash
corepack.cmd pnpm build --filter api_v2
corepack.cmd pnpm --filter api_v2 test
corepack.cmd pnpm --filter api_v2 lint
corepack.cmd pnpm --filter api_v2 typecheck

corepack.cmd pnpm build --filter web_v2
cd apps/web_v2 && pnpm exec tsc --noEmit
cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx

corepack.cmd pnpm --filter forms_runtime dev
corepack.cmd pnpm --filter forms_runtime cdk synth
```

After modifying source under `apps/web_v2`, `apps/api_v2`, or `packages`, refresh the indexes:

```bash
python scripts/update-indexes.py
```

## Runtime Shape

- Product/client apps deploy through Vercel.
- `apps/api_v2` and its worker run as separate processes/containers.
- The current low-cost hosting direction is one DigitalOcean droplet for API/worker runtime.
- Hosted forms use `apps/forms_runtime` plus `packages/forms-core`; `api_v2` remains the canonical source of truth for project resolution, trust validation, submissions, analytics, notifications, and worker fanout.

## Documentation

- Continuity: `docs/continuity/`
- API contract docs: `docs/api/`
- Implementation plans: `docs/plans/`
- Admin setup: `apps/admin/README.md`
- Production API/worker release, backup, rollback, and smoke runbook: `deploy/production/README.md`
- Forms runtime deployment notes: `apps/forms_runtime/deploy/`
- Database schema: `packages/database/prisma/schema.prisma`
