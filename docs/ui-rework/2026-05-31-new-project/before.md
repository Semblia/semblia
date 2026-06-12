# UI Rework — New Project (`/projects/new`)

Date: 2026-05-31
Branch: revamp/v2

## Required Context

- **Surface under review:** `apps/web_v2/app/(app)/projects/new/page.tsx`
- **User type:** Authenticated user creating their first/next project.
- **Primary user goal:** Name a project and create it.
- **Reference inspected:** internal — the centered single-field create form pattern; `Button`/`Input`/`Label` UI primitives.
- **Principle extracted:** A one-field create form should ask for exactly what it needs, validate inline, and get out of the way.

## Core Questions

1. First-time user understands surface? **YES** — "Create a project" + "A project groups your collection forms, testimonials, and widgets."
2. Clear primary action? **YES** — single "Create project" submit; ghost Cancel.
3. Wording in user's language? **YES**.
4. System state clear? **YES** — inline validation error (`name-error`), pending state ("Creating…" + spinner, button disabled).
5. Consequential mistakes handled? **YES** — required-field validation; creation is non-destructive; Cancel is available.
6. Deliberate hierarchy? **YES** — back link → heading → field → actions.
7. Every element useful? **YES**.
8. Patterns consistent with Semblia? **YES** — composes from `Button`/`Input`/`Label`; centered `max-w-lg` form is the right pattern for a standalone create (not a sidebar app page needing `PageHeader`). `aria-invalid`/`aria-describedby` wired correctly.
9. Trustworthy / appropriate? **YES**.
10. Leaving unchanged harms quality? **NO**.

## Conditional — Auth / Onboarding / Project Creation

1. Reduces anxiety, communicates value? **YES** — explains what a project is.
2. Next step obvious without overexplaining? **YES**.
3. Setup proportional to value? **YES** — one field.
4. Polished enough to earn trust? **YES**.

## Mechanical Quality Gate

1. Keyboard reachable? **YES** — native form, `autoFocus` on the field.
2. Focus visible? **YES**.
3. Contrast? **YES**.
4. Targets sized? **YES**.
5. Status not colour-only? **YES** — error is text via `text-destructive`, associated by id.
6. Narrow + wide? **YES** — `max-w-lg` centered.
7. Flows rechecked? no change to recheck.

## Rework Decision

Gate does **not** trigger — no Q1–5 NO, Q9/Q10 both YES, fewer than two of Q6–8 NO. **No rework.**

### Minor opportunities (recorded, not actioned)

- `Creating...` uses three periods rather than an ellipsis glyph — cosmetic, and consistent with other call sites in the app, so left as-is.
- Could surface a `maxLength`/character hint on the name field, but the API owns the constraint and there's no current evidence users hit it.

No code change, no commit for this surface.
