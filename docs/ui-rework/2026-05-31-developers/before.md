# UI Rework — Developers Hub (`/projects/[slug]/developers/*`)

Date: 2026-05-31 (audited against real files)
Branch: revamp/v2

> **Note on a prior draft:** an earlier pass in this session referenced a
> top-level `/developers` route and a `developers-client.tsx`. Neither exists.
> The real surface is project-scoped under
> `app/(app)/projects/[slug]/developers/` (overview, `keys`, `agents`, `docs`),
> composed via `components/developers/developer-shell.tsx`. This is the corrected
> audit against the files that actually render.

## Required Context

- **Surface under review:** `developer-shell.tsx`, `developer-overview-client.tsx`, `keys/keys-client.tsx`, `keys/key-list-item.tsx` (`ApiKeyRow` + `ApiKeyCard`), `keys/create-key-form.tsx`, `keys/key-detail-client.tsx`, and the parallel `agents/*` set.
- **User type:** Authenticated developer managing API/agent keys and reading integration docs.
- **Primary user goal:** Create a key (copy the secret once), view usage, rotate or revoke keys, find docs.
- **Reference inspected:** internal — the shared `DeveloperShell`/`PageBody`/`PageToolbar`/`FilterPills`/`ViewToggle`/`Empty` chrome, the shared `ConfirmationDialog`, and the `ItemRow`/`ItemCard`/`ItemActionRow` primitives.
- **Principle extracted:** Key management is destructive-heavy, so every irreversible action must be confirmed and every list state must be legible (status, usage, masked secret).

## Core Questions

1. First-time user understands surface? **YES** — shell tabs (overview/keys/agents/docs); keys split into Publishable/Secret sections; empty states explain key types.
2. Clear primary action? **YES** — "New key" dropdown (publishable/secret) + per-type "New …" buttons.
3. Wording in user's language? **YES** — "Publishable", "Secret", "Revoke", "Rotate".
4. System state clear? **YES** — list/card skeletons, status chips (revoked/expired), masked key + copy, usage/rate/last-used metrics, `RefreshingDataBadge` semantics via the shared hooks.
5. **Consequential mistakes handled? YES** — both revoke *and* rotate are gated behind the shared `ConfirmationDialog` (`key-list-item.tsx`, `ApiKeyRow` and `ApiKeyCard`): revoke = "This key stops working immediately. You can't undo it." / rotate = "Rotating replaces the secret immediately…". This matches the app-wide destructive-confirm convention.
6. Deliberate hierarchy? **YES** — toolbar (search + status filters + view toggle) → Publishable section → Secret section.
7. Every element useful? **YES**.
8. Patterns consistent with Semblia? **YES** — shared shell/toolbar/empty + `ItemRow`/`ItemCard`/`ItemActionRow`; brand tokens (`bg-brand-muted`, `text-brand-foreground`, `var(--brand)` accent) and semantic `destructive`/`amber` status colours.
9. Trustworthy / appropriate? **YES** — secret is shown once on create; thereafter masked.
10. Leaving unchanged harms quality? **NO**.

## Mechanical Quality Gate

1. Keyboard reachable? **YES** — dropdowns, links, action rows are native/Radix.
2. Focus visible? **YES** — shared primitives.
3. Contrast? **YES**.
4. Targets sized? **YES**.
5. Status not colour-only? **YES** — status chips carry text ("revoked"/"expired"), not colour alone.
6. Narrow + wide? **YES** — list/grid view toggle; action rows collapse under a width threshold.
7. Flows rechecked? n/a — no change.

## Rework Decision

Gate does **not** trigger — every Q1–Q10 is YES against the real files. In particular, the destructive-confirm gap imagined by the earlier draft does **not** exist: revoke and rotate are already confirmed. **No rework.**

No code change, no commit for this surface.
