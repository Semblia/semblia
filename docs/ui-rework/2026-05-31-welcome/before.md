# UI Rework — Welcome / Onboarding (`/welcome`)

Date: 2026-05-31 (audited against real files)
Branch: revamp/v2

> **Note on a prior draft:** an earlier pass referenced a single-field
> `components/welcome/welcome-client.tsx`. The real surface is a **multi-step
> onboarding wizard** at `app/(standalone)/welcome/`: `page.tsx` → `_welcome-flow.tsx`,
> with `_welcome-shell.tsx`, `_step-rail.tsx`, `_step-frame.tsx`, and step
> components in `steps/` (`intent-step`, `profile-step`, `project-step`,
> `collection-step`, `referral-step`). This is the corrected audit.

## Required Context

- **Surface under review:** `app/(standalone)/welcome/` wizard (shell + step rail + animated step frame + step screens).
- **User type:** Brand-new authenticated user (correctly scoped to new users only).
- **Primary user goal:** Set up their profile + first project and reach the product.
- **Reference inspected:** internal — the animated multi-step pattern (shared `useAnimatedStep`), the auth two-step flow, and the shared form primitives.
- **Principle extracted:** A first-run wizard should show progress, ask for the minimum per step, allow back-navigation, and never trap the user.

## Core Questions

1. First-time user understands surface? **YES** — stepped flow with a visible rail (intent → profile → project → collection → referral) inside a dedicated welcome shell.
2. Clear primary action? **YES** — one forward action per step; the step frame animates forward/back.
3. Wording in user's language? **YES**.
4. System state clear? **YES** — animated step transitions, per-step rail position, pending/disabled handling on submits.
5. Consequential mistakes handled? **YES** — steps are reversible; project creation is non-destructive.
6. Deliberate hierarchy? **YES** — shell → rail → framed step content.
7. Every element useful? **YES** — each step collects one coherent slice of setup.
8. Patterns consistent with Semblia? **YES** — shares `useAnimatedStep`, the standalone shell layout, and the shared field/button primitives used across auth.
9. Trustworthy / appropriate? **YES** — branded, personalized, scoped to genuinely-new users.
10. Leaving unchanged harms quality? **NO**.

## Conditional — Auth / Onboarding / Project Creation

1. Reduces anxiety, communicates value? **YES** — staged, low-pressure, one ask at a time.
2. Next step obvious without overexplaining? **YES** — rail + single forward action.
3. Setup proportional to value? **YES** — short, skippable-feeling steps that culminate in a real project.
4. Polished enough to earn trust? **YES** — animated, consistent with the rest of the product chrome.

## Rework Decision

Gate does **not** trigger — all Q1–Q10 YES and all conditional onboarding checks pass. **No rework.**

No code change, no commit for this surface.
