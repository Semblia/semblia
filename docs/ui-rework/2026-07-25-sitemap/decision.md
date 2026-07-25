# Decision — New App Sitemap (2026-07-25)

## The new route map

```
/                                  Projects home (list)         [was /projects + / redirect]
/new                               Create project               [was /projects/new]
/[project]                         Project overview             [was /projects/[slug]]
/[project]/forms                   Forms list
/[project]/forms/[formId]          Form studio
/[project]/forms/[formId]/preview  Full-page preview
/[project]/responses               Responses inbox
/[project]/widgets                 Widgets list
/[project]/widgets/[id]            Widget studio
/[project]/widgets/[id]/preview    Full-page preview
/[project]/analytics               Analytics
/[project]/integrations           Integrations                 [was …/developers/integrations — PROMOTED]
/[project]/developers              Developer hub (overview)
/[project]/developers/keys         (+ /new, /[keyId])
/[project]/developers/agents       (+ /new, /[keyId])
/[project]/developers/webhooks     (+ /new)
/[project]/developers/exports      CSV export artifacts
/[project]/developers/activity     Project activity log         [was …/developers/audit — RENAMED]
/[project]/settings                General
/[project]/settings/branding
/[project]/settings/visibility
/[project]/settings/social
/[project]/settings/domains        Hosted addresses/domains     [was …/settings/hosts — RENAMED]
/[project]/settings/security       Trusted origins + secrets    [was …/settings/trust — RENAMED]
/[project]/settings/members
/[project]/settings/danger
/account (+ /profile /security /notifications /billing)         unchanged
/welcome · auth routes · /legal/* · /wall/[slug] · /_wall-host  unchanged (locked/public)
```

Max depth: 4 segments everywhere (was 5). Sidebar: Forms · Responses ·
Widgets · Analytics · Integrations · Developers · Settings.

## Decisions and rationale

1. **Projects move to the URL root** (principle 1). The `/projects/` prefix
   spent a segment on zero information. Enforced by `RESERVED_PROJECT_SLUGS`
   in `@workspace/types`, applied by api_v2 at project create AND rename
   (previously rename only checked DNS shape — a project renamed to `account`
   would have shadowed an app route once slugs went root-level).
2. **`/` is the projects home.** The silent redirect-to-last-project made
   home unpredictable. The last-used-project server pointer stays recorded
   (cheap, future "continue" affordance) but no longer hijacks `/`.
3. **Integrations is promoted to a top-level section.** Locked product
   posture is "integration-first" (decisions.md 2026-05-03); a first-class
   pillar was buried two levels deep in a developer hub.
4. **Jargon renames** (principle 7): `hosts→domains`, `trust→security`,
   `audit→activity`. URL and label now agree.
5. **Developers keeps keys/agents/webhooks/exports/activity.** True
   credential/API surfaces; Stripe validates the grouped-developer-hub
   pattern. Not promoted to avoid an 12-item sidebar.
6. **Old URLs redirect permanently** (`next.config.ts redirects()`), including
   section renames — bookmarks and api_v2-issued notification links in the
   old shape keep resolving. api_v2 switches to issuing new-shape links.
7. **Internal routes are code, not strings**: `apps/web_v2/lib/routes.ts` is
   the sitemap as typed builders; hand-built internal hrefs are banned the
   same way `semblia-urls.ts` centralized public URLs.

## Out of scope (locked or deliberate)

- Public wall/forms URL shapes (subdomain hosting decisions, 2026-07-14).
- Merging settings sections or account routes — flat already, contentful
  merges are a product call.
- A `~` sentinel segment (Vercel-style) — unnecessary: Semblia has no
  tenant-level pages competing with project slugs at root beyond the
  reserved list.
