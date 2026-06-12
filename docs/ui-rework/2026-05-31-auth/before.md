# UI Rework — Auth Flows (`/(auth)/*`)

Date: 2026-05-31 (audited against real files)
Branch: revamp/v2

> **Note on a prior draft:** an earlier pass referenced `auth-shell.tsx`,
> `sign-in-form.tsx`, etc. in `components/auth/`, and a "router.replace during
> render" bug. None of that is real. `components/auth/` holds primitives
> (`auth-field`, `auth-password-field`, `auth-primary-btn`, `auth-social-buttons`,
> `auth-divider`, `auth-back-btn`, `auth-checkbox`, `auth-notice`, `clerk-error`,
> `spinner`); the actual forms are co-located in the route folders. This is the
> corrected audit.

## Required Context

- **Surface under review:** `app/(auth)/sign-in/[[...sign-in]]/_form.tsx`, `app/(auth)/sign-up/[[...sign-up]]/_form.tsx` (+ `details-step`, `verify-step`), `app/(auth)/forgot-password/_form.tsx`, `app/(auth)/sso-callback/page.tsx`, `app/(auth)/layout.tsx`.
- **User type:** Unauthenticated visitor signing in / signing up / recovering a password.
- **Primary user goal:** Authenticate with minimum friction (email+password or OAuth).
- **Reference inspected:** internal — the shared `auth-*` primitives, `useAnimatedStep`, and the centralized `errMsg` Clerk-error mapper.
- **Principle extracted:** Auth should be progressive (ask email, then password), forgiving (clear inline + form-level errors), and offer OAuth up front.

## Core Questions

1. First-time user understands surface? **YES** — "Welcome back" / sign-up details + verify; clear headings and sublabels.
2. Clear primary action? **YES** — single "Continue"/"Sign in"/"Verify" submit per step, plus OAuth buttons.
3. Wording in user's language? **YES**.
4. System state clear? **YES** — `loading`/`busy` gating, per-provider OAuth spinner, loading labels ("Continuing…", "Signing in…"), `AuthNotice` for form-level errors, inline field errors.
5. Consequential mistakes handled? **YES** — non-destructive; Clerk errors mapped to friendly copy via `errMsg`; MFA/edge statuses produce explicit messages; back button preserves email and clears password.
6. Deliberate hierarchy? **YES** — header → OAuth → divider → form → cross-link (sign in ⇄ sign up).
7. Every element useful? **YES**.
8. Patterns consistent with Semblia? **YES** — composes the `auth-*` primitives and `useAnimatedStep`; brand hover accents; `noValidate` with custom validation; correct `autoComplete` attributes; focus management via `useEffect` (no render-phase side effects).
9. Trustworthy / appropriate? **YES**.
10. Leaving unchanged harms quality? **NO** (after the small cleanup below).

## Mechanical Quality Gate

1. Keyboard reachable? **YES** — native forms, refs for focus.
2. Focus visible? **YES** — shared field primitives; deliberate autofocus on email/password.
3. Contrast? **YES**.
4. Targets sized? **YES**.
5. Status not colour-only? **YES** — errors are text via `AuthNotice`/field error props.
6. Narrow + wide? **YES** — centered auth card.
7. Flows rechecked? sign-in/sign-up re-read after the cleanup.

## Rework Decision

Gate does **not** trigger on UX — every Q1–Q10 is YES. The auth flow is already polished and progressive.

### One cleanup actioned (code-cleanliness, not a UX rework)

- Removed a leftover `console.log(session.currentTask)` from the post-auth `finalize` navigation callback in both `sign-in/.../_form.tsx` and `sign-up/.../_form.tsx`. Debug logging shouldn't ship in the auth path; the surrounding `if (session?.currentTask) return;` early-return behaviour is unchanged.

No other code change for this surface.
