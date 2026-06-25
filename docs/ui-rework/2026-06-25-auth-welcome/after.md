# After-audit — auth + welcome rebuild

Verified live against the running dev server (web_v2 :3002, api_v2 :8100) via
Chrome on 2026-06-25.

## What shipped
- **`(auth)/layout.tsx`** rebuilt: flashy two-pane (hairline grid, radial glow,
  vignette, 4rem display headline, numbered manifesto, mono eyebrows, "Est. 2026")
  → calm framed card. App top bar (`SembliaWordmark` + `ThemeToggle`) · centered
  bordered card on the warm app background · quiet footer (Terms · Privacy · ©).
- **Motion retuned** in `globals.css`: auth entrance 450→220ms; step transitions
  360/180→200/130ms; onboarding 450–500→240/140ms; dropped scale, smaller translate.
  No more ~1s staggered reveal on every login.
- **Welcome** rebuilt: dark editorial brand rail (`_step-rail.tsx`, deleted) →
  same calm frame as auth (top bar + segmented progress + top-aligned content).
- **Flow recomposed 5 screens → 4** over the unchanged 5-step server contract:
  profile (+ re-activated `jobTitle` role chips) · **goals** (intent primary +
  referral demoted to optional secondary, persisted together as one `INTENT`
  PATCH) · project · collection. `REFERRAL`/`INTENT` cursors both resume on goals.
- Removed banned tells from steps (e.g. collection's mono-uppercase "Collection
  link · Live" eyebrow; the per-step "Step 01" kicker, now covered by progress).

## Gates
- `pnpm exec tsc --noEmit` — clean
- `pnpm exec eslint "app/(auth)" "app/(standalone)/welcome"` — clean
- `pnpm build --filter web_v2` — 6/6 tasks successful
- `python scripts/update-indexes.py` — run

## Verified screens (live)
Sign-in (dark + light), sign-up, welcome profile (role chips, dynamic greeting),
welcome goals (combined, functional framing, selected state). Project + collection
steps not walked live to avoid creating test-account data; they are reskins of the
same verified shell.

## Still open (backend / Codex lane — see decision.md §4)
Wire captured signals to real defaults: `intent.intents[]` → project
`projectType`/`visibility`/`autoModeration`, form field + widget `layoutType`
defaults; `profile.jobTitle` → notification prefs + widget density. Requires API
work (`createProject` body, `account-defaults.service.ts`, `onboardingDataPatchSchema`).
