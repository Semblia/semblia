# Live studio verification — 2026-06-16

> Ran the actual Tresta stack (api_v2 `:8100`, web_v2 `:3002`, Postgres+Redis via
> Docker) and drove it logged-in with the provided test account
> (`test+clerk_test@semblia.com`) via `agent-browser`. This is real, authenticated
> evidence of Tresta's **own** studios (the competitor builders behind login remain
> inaccessible — see `../2026-06-15-studio-competitors/`). Screenshots in this dir.

## What was verified

### ✅ Form starter gallery works end-to-end (commit `38179b89`)
- `screens` `collect-list.png` — the Collect empty state renders the 4 starters
  (Quick testimonial / Detailed review / Guided flow / Compact inline) + Blank,
  each with a layout-keyed thumbnail.
- `collect-studio.png` — clicking **Quick testimonial** created a real form
  (`POST` with `config`) and opened the studio; the preview iframe rendered the
  starter's authored headline **"Share your experience"**. The `config` posted,
  persisted, and rendered against the real backend — not just unit tests.

### 🐛 Discovered defect: Widget Studio does not survive reload / direct-nav
- `widgets-list.png`, `widget-studio.png` — the widget studio renders when reached
  by in-session SPA navigation (carousel widget).
- **But** opening/reloading a real widget's studio URL directly
  (`/projects/<slug>/widgets/<apiId>`) lands on the **"Back to widgets" /
  "this widget no longer exists"** bail state. Root cause: the widget studio
  persists drafts in a local zustand store keyed by **local `w_…` ids**, separate
  from the API widget id in the route; on a cold load only `localStorage`
  hydrates (stale local ids), so `snapshots[apiId]` is missing → bail. This is the
  same local-store/server-draft gap behind the deferred **publish-parity** item
  (`docs/plans/2026-06-15-...roadmap.md`), now confirmed by observation. It is a
  pre-existing issue, independent of any change this session.

## Widget "starter look" — built, then reverted (correctly)
Mirroring the forms gallery, a "Starting look" preset row was added to the embed
creation picker, threaded via `?look=<presetId>`, and applied once on first-run in
the studio shell (reusing the existing `applyStylePreset` store action).
`widget-create-look.png` shows the picker row rendering correctly (all 6 presets).
**However**, live verification (`widget-studio-noir.png` + store/DOM inspection)
showed the studio bailed for the freshly-created widget (the hydration defect
above), so the chosen look could not be applied reliably. Per the project's
"verify before shipping" bar, the feature was **reverted** rather than shipped on a
flaky foundation. It should be re-landed once the widget studio is wired to the
server draft API (`useWidgetDraft`/`useSaveWidgetDraft`) so a widget hydrates by
API id on cold load — at which point the look (and publish-parity) become reliable.

## Takeaway
The forms surface is solid and the starter gallery is a real, verified win. The
widget studio needs the server-draft hydration fix (publish-parity) **before**
creation-time theming or deep-linking can be trusted — this session turned that
from a suspected risk into a confirmed, reproducible defect with a clear fix path.
