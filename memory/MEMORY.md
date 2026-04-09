# Durable Memory

- 2026-04-09 23:40:45 +05:30, Codex: `apps/api_v2` is a bare-bones NestJS scaffold only. It runs on port `8100`, exposes `/health`, and wires shared Prisma, Redis/BullMQ, and Clerk-ready config without migrating the existing Express API surface.
- 2026-04-09 23:40:45 +05:30, Codex: V2 gap persistence added at the DB layer in `packages/database/prisma/schema.prisma`: `ApiKeyDailyUsage`, `TestimonialImpression`, `FormImpression`, and `NotificationPreferences.typePreferences`.
- 2026-04-09 23:42:00 +05:30, Cascade: `apps/web_v2` dev server runs on port 3002. Tailwind v4 — no `tailwind.config`, tokens live in `app/globals.css` as CSS custom properties (`--brand`, `--warning`, `--success`, etc.).
- 2026-04-09 23:42:00 +05:30, Cascade: `apps/web_v2/lib/mock-data.ts` contains schema-accurate mock data (User, Project, Testimonial, Widget, ApiKey, Notification, Subscription). `apps/web_v2/lib/api.ts` wraps it with 180–440 ms simulated latency; all function signatures mirror planned `/v2/` endpoints.
- 2026-04-09 23:42:00 +05:30, Cascade: Route tree for `apps/web_v2`: `/projects` (static), `/projects/[slug]` (dynamic hub), `/projects/[slug]/testimonials` (dynamic inbox). Root `/` redirects to `/projects`.
- 2026-04-09 23:42:00 +05:30, Cascade: `API_GAPS_FOR_V2.md` at repo root documents 11 schema gaps with suggested DB models. Two gaps now have concrete SQL additions: `ApiKeyDailyUsage` (daily request counts) and `CustomDomain` (custom collection URL verification).
- 2026-04-09 23:43:00 +05:30, Cascade: Active sidebar nav items get a 2 px brand-color left accent via `[data-sidebar="menu-button"][data-active="true"]::before` in `app/globals.css`.
- 2026-04-09 23:43:00 +05:30, Cascade: Project hub `<aside>` uses `border-l border-border` (CSS) for the vertical divider — the `<Separator>` component was removed. Aside width is `lg:w-72`.
- 2026-04-09 23:43:00 +05:30, Cascade: `RatingDistribution` bar chart and published-% progress bar (`progress` prop on `StatTile`) live in `app/(app)/projects/[slug]/page.tsx`. Both are server-rendered; no extra fetch needed.
