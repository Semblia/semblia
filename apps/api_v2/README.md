# api_v2

Bare-bones NestJS scaffold for the future V2 API surface.

Current scope:

- Config + env validation
- Shared Prisma connection via `@workspace/database`
- Shared Redis client + BullMQ bootstrap
- Clerk-ready service wiring
- Health endpoint

Run locally:

```bash
pnpm api_v2:dev
```

Default port: `8100`
