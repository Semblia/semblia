# Principles — App Sitemap (2026-07-25)

Derived from live study of Vercel, GitHub, Linear, and Stripe dashboard URL
architectures plus NN/g flat-hierarchy guidance (research via parallel agents,
2026-07-25).

1. **The tenant object sits at the URL root.** `/[project]/forms`, not
   `/projects/[slug]/forms`. Two segments reach real work; every URL is
   shareable and self-describing. Vercel (`/[team]/[project]`) and GitHub
   (`/[owner]/[repo]`) both pay for this with an explicit reserved-slug
   blocklist enforced at slug-creation time — cleaner URLs are worth
   maintaining the list.
2. **The URL is the nav.** Sections under a project are a flat list of
   lowercase nouns that match the sidebar labels exactly. A URL segment that
   doesn't match a visible label is IA drift (our `audit` page labelled
   "Activity" was the smoking gun).
3. **Detail extends list.** `/forms` → `/forms/[id]`; same segment name for
   list and detail. GitHub's `pulls` vs `pull/[n]` split is the canonical
   regret to avoid.
4. **Depth caps at 4 segments.** `/[project]/section/[id]` or
   `/[project]/settings/subsection`. Extra state (tab, filter) is a query
   param, never more hierarchy.
5. **Settings is one section with one flat level of subsections.** Never a
   third level unless a subsection is a true sub-collection with detail pages.
6. **Creation is a short global route.** `/new` (Vercel, GitHub) resolves
   tenant from session; avoids `/[project]/new` ambiguity.
7. **Plain words over jargon.** `domains` not `hosts`, `security` not
   `trust`, `activity` not `audit`. Rename the URL and the label together.
8. **Slugs are contracts.** Server-validated against the reserved list on
   create AND rename; old URL shapes get permanent redirects, not 404s.
9. **Predictable home.** `/` is the projects home — one stable mental anchor
   for "where am I", replacing the silent last-used-project redirect.
