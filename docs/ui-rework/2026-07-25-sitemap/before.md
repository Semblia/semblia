# Before — App Route Map Audit (2026-07-25)

User directive: "The routes are too confusing and non-intuitive. Remake the
entire route map of the application into a clean, navigable sitemap. The
lesser nested navigation the better."

## Current sitemap (authenticated app, `apps/web_v2`)

```
/                                    → redirect: last-used project, else /projects
/projects                            Projects list (workspace home)
/projects/new                        Create project
/projects/[slug]                     Project overview
/projects/[slug]/forms               Forms list
/projects/[slug]/forms/[formId]      Form studio
/projects/[slug]/forms/[formId]/preview
/projects/[slug]/responses           Responses inbox
/projects/[slug]/widgets             Widgets list
/projects/[slug]/widgets/[id]        Widget studio
/projects/[slug]/widgets/[id]/preview
/projects/[slug]/analytics
/projects/[slug]/developers          Developer hub (overview)
/projects/[slug]/developers/keys     (+ /new, /[keyId])
/projects/[slug]/developers/agents   (+ /new, /[keyId])
/projects/[slug]/developers/webhooks (+ /new)
/projects/[slug]/developers/exports
/projects/[slug]/developers/integrations
/projects/[slug]/developers/audit    (labelled "Activity")
/projects/[slug]/settings            General
/projects/[slug]/settings/branding
/projects/[slug]/settings/visibility
/projects/[slug]/settings/social
/projects/[slug]/settings/hosts
/projects/[slug]/settings/trust
/projects/[slug]/settings/members
/projects/[slug]/settings/danger
/account                             (+ /profile /security /notifications /billing)
/welcome                             Onboarding (standalone shell)
/sign-in /sign-up /forgot-password /sso-callback
/legal/privacy /legal/terms
/wall/[wallSlug]                     Public wall (legacy adapter — LOCKED contract)
/_wall-host/*                        Subdomain-wall rewrite target — LOCKED contract
/design                              Dev playground
```

## Measured pain points

1. **Redundant `/projects/` prefix.** Every project URL spends a segment on a
   word that carries no information once you're inside a project. Deepest
   routes reach 5 segments (`/projects/[slug]/developers/agents/[keyId]`,
   `/projects/[slug]/forms/[formId]/preview`).
2. **Root is unpredictable.** `/` silently redirects to the last-used
   project's overview (server pointer + legacy cookie fallback). Users can't
   form a stable model of "where home is".
3. **The Developers hub hoards non-developer surfaces.** 7 sub-items; of
   them, Integrations is a first-class product pillar (locked decision:
   "integration-first, not conservative-minimal") buried two levels deep, and
   "Audit" (labelled Activity in nav — a label/URL mismatch) is a project
   activity log, not a developer tool.
4. **Jargon segment names.** `settings/hosts` (hosted addresses/domains),
   `settings/trust` (trusted origins + signing secrets), `developers/audit`
   (activity log). Every one requires product knowledge to parse.
5. **No central route helper.** ~100 hard-coded internal route literals
   across ~60 files (`components/nav/*`, studios, analytics cards, tests,
   `proxy.ts`, Clerk env). Public URLs are centralized (`lib/semblia-urls.ts`)
   but app routes are not — any restructure today is a repo-wide grep.
6. **Label/URL drift.** Nav says "Activity", URL says `audit`; nav says
   "Hosts" for what the product elsewhere calls hosted addresses/domains.

## Constraints (locked, out of scope)

- Public walls: `<host>.walls.semblia.com` + `semblia.com/wall/[slug]` legacy
  adapter, `/_wall-host` rewrite target (decisions 2026-07-14).
- Hosted forms live on `forms.semblia.com` subdomains (separate runtime app).
- Full-bleed app shell; auth screens; `/welcome` onboarding flow semantics.
- Project slugs: DNS-label-safe, reserved-checked at create
  (`isValidSembliaFreeHostLabel`) but only DNS-checked on update.
