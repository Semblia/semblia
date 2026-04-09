# Durable Decisions

- 2026-04-09 23:40:45 +05:30, Codex: Validate new Prisma migrations against a clean local clone database (`appdb_v2_clone`) instead of the existing `appdb` when local schema drift exists.
- 2026-04-09 23:40:45 +05:30, Codex: Added a no-op placeholder migration for `20260406000000_user_scoped_api_keys` to restore a complete checked-in migration chain for fresh local databases.
- 2026-04-09 23:42:00 +05:30, Cascade: `web_v2` pages that need interactive state (loading, filters, view toggle) use a server-component wrapper (`page.tsx`) that exports `metadata`, delegating rendering to a `"use client"` component. This preserves static metadata without moving data fetching to the server.
- 2026-04-09 23:42:00 +05:30, Cascade: Testimonials inbox uses optimistic UI: status overrides and publish overrides are tracked in local `Map` state; API mutations fire in the background. On filter change the overrides persist for the lifetime of the mount.
- 2026-04-09 23:42:00 +05:30, Cascade: Card/list view preference is persisted to `localStorage` under key `tresta:projects:view`. No server state needed.
- 2026-04-09 23:42:00 +05:30, Cascade: Sidebar shows project shortcuts (with pending badges) when on `/projects`; switches to project-scoped nav when inside `/projects/[slug]/*`. Controlled by `usePathname` matching in `AppSidebar`.
- 2026-04-09 23:43:00 +05:30, Cascade: Structural dividers between page sections use CSS borders on elements (`border-l`, `border-t`) rather than `<Separator>` components. Keeps the DOM flatter.
