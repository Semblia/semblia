---
paths:
  - "apps/api_v2/**"
---

# apps/api_v2 — NestJS API

- Runs as **two processes**: the HTTP API and a separate worker. Changes to
  queues, delivery, or async jobs need both restarted and verified.
- BullMQ job IDs must never contain `:` — colons silently break job
  addressing.
- Security posture is load-bearing here: public submit routes are gated by
  Origin/HMAC per `docs/semblia-v2-architecture-handoff-public-routes.md`;
  standing watch items live in `docs/v2-security-audit-2026-04-29.md`. Any
  change to auth, public routes, or serving of user content gets checked
  against both.
- API contract changes (DTOs, enums, routes) update the shared types package
  and the `web_v2` consumers in the same PR — never ship a contract drift.
- Build gate: `pnpm build --filter api_v2`.
