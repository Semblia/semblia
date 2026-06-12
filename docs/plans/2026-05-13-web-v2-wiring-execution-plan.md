# Web V2 Wiring Execution Plan

Status: Approved for implementation on 2026-05-13.

## Summary

Continue `web_v2` wiring in small, reviewable increments. After every wiring slice, pause for user review of live-data UI, empty states, loading/error states, and edge cases before moving to the next slice. This file is the approved execution plan for the current wiring pass.

## Execution Rhythm

- For each wiring slice: implement the smallest coherent backend-backed surface, run targeted checks, update indexes, and commit.
- Then run a UI refinement subphase: wait for user review, refine empty states/live-data edge cases, rerun relevant checks, and commit separately.
- Prefer multiple small commits inside a phase over one consolidated phase commit. Good commit boundaries are one route cluster, one hook/client cluster, one UI refinement, or one test/continuity update.
- Do not proceed from one main wiring phase to the next until the review/refinement subphase is complete or explicitly deferred by the user.

## Key Changes

- Phase 0: write the approved plan, confirm clean git state, and baseline `web_v2`.
- Phase 1a: wire project shell/detail navigation by replacing project layout/sidebar/topbar/switcher mock lookups with typed project data.
- Phase 1b: pause for review and refine shell empty states, missing-project states, capability-aware nav visibility, and live project metadata display.
- Phase 2a: wire testimonials, submissions, moderation, and display-suggestion flows to typed V2 hooks.
- Phase 2b: pause for review and refine inbox/detail empty states, moderation edge cases, loading states, and unsafe-action affordances.
- Phase 3a: wire forms, widgets, and studio drafts to server-backed list/detail/draft APIs.
- Phase 3b: pause for review and refine builder/studio empty states, stale draft conflicts, no-widget/no-form states, and preview fallbacks.
- Phase 4a: wire settings, members/access, allowed origins, signing secret, API keys, and agent access.
- Phase 4b: pause for review and refine credential reveal/copy states, disabled permission states, empty member/key states, and destructive-action confirmations.
- Phase 5a: wire outbound webhooks, CSV exports, native integrations, and action audit.
- Phase 5b: pause for review and refine delivery failure states, retry affordances, empty integration states, audit filtering, and export readiness/download states.
- Phase 6a: wire notifications, analytics summary/events, and public-surface resolution.
- Phase 6b: pause for review and refine notification empty/read states, analytics zero-data states, public host failures, and live-data dashboard copy.
- Phase 7: remove or quarantine retired mock consumers, update continuity docs, and run final verification.

## Interfaces

- Extend `apps/web_v2/lib/semblia-api.ts` and `apps/web_v2/hooks/api/*` only for existing backend contracts.
- Use shared DTOs from `@workspace/types`.
- Keep billing disabled, hidden, or read-only until the billing source-of-truth decision is made.

## Test Plan

- Run targeted tests per slice plus `web_v2` typecheck, lint, test, and build before claiming each main wiring slice done.
- After UI refinement subphases, rerun the affected tests and at least the relevant typecheck/lint path.
- After source edits, run `python scripts/update-indexes.py`; refresh graphify when required by repo rules.

## Assumptions

- User reviews are explicit gates between wiring phases.
- Small atomic commits are preferred over phase-sized commits.
- Backend contracts remain canonical; UI adapts to live DTOs and live edge cases.
