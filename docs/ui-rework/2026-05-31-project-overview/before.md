# UI Rework — Project Overview (`/projects/[slug]`)

Date: 2026-05-31
Branch: revamp/v2

## Required Context

- **Surface under review:** `apps/web_v2/app/(app)/projects/[slug]/page.tsx`
- **User type:** Authenticated project owner / collaborator
- **Primary user goal:** Land on a project and reach its working surface.

## Finding

This route renders **no UI**. The page is a pure server redirect:

```tsx
export default async function ProjectIndexPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  redirect(`/projects/${slug}/testimonials`);
}
```

`layout.tsx` is a passthrough wrapper with no chrome of its own. The effective
"project overview" the user sees is the **Testimonials inbox**, which was already
reworked on 2026-05-27 (`docs/ui-rework/2026-05-27-testimonials-inbox/`).

## Decision

**No rework.** There is no rendered surface here to audit against the checklist —
the Core Questions and Mechanical Quality Gate are all `N/A`. The redirect target
(testimonials inbox) is already a completed surface.

No code change, no commit for this surface.
