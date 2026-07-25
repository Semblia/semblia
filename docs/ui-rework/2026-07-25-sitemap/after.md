# After — Verification Evidence (2026-07-25)

## Static gates

- `@workspace/types` build: green (new `reserved-project-slugs.ts` export).
- `api_v2`: `tsc --noEmit` green; `projects`/`responses` specs 66/66 green
  (incl. new regression tests: reserved slugs rejected at create AND rename);
  `pnpm build --filter api_v2` green.
- `web_v2`: `tsc --noEmit` green, `eslint` clean, vitest 140/140 across 33
  files (root-redirect test removed with the behavior), `pnpm build --filter
  web_v2` green — the emitted route manifest is the new sitemap.
- Repo sweep: zero `/projects` route literals left in `apps/web_v2` source
  (the only hits were stale `.next` artifacts, since cleared, and the
  documenting comment in `lib/routes.ts`).
- `python scripts/update-indexes.py` run after the changes.

## Runtime (dev stack: web :3002, api :8100, docker pg/redis)

Redirect layer (curl, all `308`):

```
/projects                              -> /
/projects/new                          -> /new
/projects/acme                         -> /acme
/projects/acme/forms                   -> /acme/forms
/projects/acme/settings/hosts          -> /acme/settings/domains
/projects/acme/settings/trust          -> /acme/settings/security
/projects/acme/developers/audit        -> /acme/developers/activity
/projects/acme/developers/integrations -> /acme/integrations
/projects/acme/developers/keys/key_1   -> /acme/developers/keys/key_1
```

Signed-in walk (Playwright harness, Clerk test user; every page HTTP 200,
**zero console errors**): `/`, `/new`, `/agency-portfolio` (→ forms),
`/agency-portfolio/{forms,responses,widgets,analytics,integrations,
developers,developers/activity,settings/domains,settings/security}`, the
form studio and widget studio at their new deep routes, and the in-browser
legacy redirect `/projects/agency-portfolio/forms` → `/agency-portfolio/forms`.
Sign-in lands on `/` (projects home).

Screenshots in `shots/`: projects home at `/`, forms with the new 7-item
sidebar (Integrations promoted), the top-level Integrations page, and
Settings → Domains with the renamed rail (Domains/Security).

## Outcome vs. before

- Max URL depth 5 → 4; every section is ≤3 segments from home.
- `/` is a stable, predictable home (was a silent redirect).
- URL segments match nav labels 1:1 (activity, domains, security).
- ~100 scattered route literals → one typed module (`lib/routes.ts`).
- Slug/route collision is now structurally impossible (shared
  `RESERVED_PROJECT_SLUGS` enforced at create + rename).
- Old URLs (bookmarks, stored api_v2 notification links) 308-redirect.
