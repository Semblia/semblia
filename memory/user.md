# User Preferences

- 2026-04-09 23:40:45 +05:30, Codex: When the V2 API surface is still unvalidated, prefer DB/schema work and gap documentation over changing the current Express API.
- 2026-04-11, Cascade: Always UI first with mock data; migrate to real API only after user confirms UI is satisfactory. Do NOT reference `apps/api` implementations — all `api_v2` surfaces are built from scratch.
- 2026-04-09 23:40:45 +05:30, Codex: Keep `apps/api_v2` as a bare-bones NestJS scaffold until the V2 API surface is validated.
- 2026-04-09 23:42:00 +05:30, Cascade: Prefers dense, compact headers — reduced avatar sizes, tighter padding (`py-3` not `py-4`), smaller font weights in hub header (`text-sm`, not `text-base`).
- 2026-04-09 23:42:00 +05:30, Cascade: Stats strip in project hub gets `urgent` tinting (warning colour + progress bar) when pending count > 0; a `RatingDistribution` bar chart lives in the aside panel.
- 2026-04-09 23:42:00 +05:30, Cascade: Testimonials page header is a single sticky 56 px (`h-14`) bar combining breadcrumb + counts; the filter tab bar sticks at `top-14` beneath it.
- 2026-04-09 23:43:00 +05:30, Cascade: Page root divs use `flex flex-1 flex-col`, not `min-h-screen`/`min-h-[100dvh]`. Height is owned by `SidebarInset`, not the page.
- 2026-04-09 23:43:00 +05:30, Cascade: Sidebar nav groups use `px-1.5` padding; header uses `pt-3 pb-2`; footer uses `py-2.5`. Tighter than shadcn defaults.
