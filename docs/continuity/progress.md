# Progress Ledger

Last updated: 2026-05-02

## Current Snapshot

- Branch at last sync: `revamp/v2`.
- Worktree at last sync: clean.
- Remote state at last sync: ahead of `origin/revamp/v2` by 28 commits.
- Current stage: backend/database-first API surface completion before serious `web_v2` wiring.
- Current checkpoint: Phase 1a through 1d of the backend-first continuation are complete.
- Next likely checkpoint: reconcile Phase 1e auxiliary product data, then move into Phase 2 common API contracts.

Always re-run `git status --short --branch` and `git log --oneline -12` before using this snapshot as current state.

## Executive Status

The original `api_v2` rebuild has been completed through its cross-cutting validation phase. The newer backend-first continuation, driven by the consolidated API/UI/database decisions, has completed the first database/API foundation slices:

- normalized public trust and host foundations
- canonical form submission writes
- testimonial private metadata split
- shared server-side drafts for forms and widgets

The project is not yet at the main `web_v2` wiring pass. The correct path is to finish API-side canonical contracts and auxiliary surfaces first, then adapt `web_v2` to those contracts.

## Phase Ledger

### Original API Rebuild

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 0 Discovery dossier | Done | `1e43be8` | Historical API rebuild discovery. |
| 1 Prisma schema refactor | Done | `bf05b49` | Initial v2 schema refactor. |
| 2 `api_v2` scaffolding and shared infra | Done | `6443bb6` | Nest v2 scaffold and shared infra. |
| 2.5 tooling hardening | Done | `b281279` | Nest CLI, ESLint, Prettier, smoke-start. |
| 2.6 `web_v2` Vitest compatibility | Done | `7a4d75d` | jest-dom to Vitest-native matcher cleanup. |
| 3a Users | Done | `35e8f08` | User domain. |
| 3b Projects | Done | `d8004b0` | Project domain and owner membership. |
| 3b.5 Public-route prerequisites | Done | `d562bb4` | Schema deltas, crypto, authz infra. |
| 3c Widgets | Done | `ecdea31` | Auth widgets, public embeds, public walls. |
| 3d Testimonials | Done | `5a9e784` | Auth and public testimonial APIs. |
| 3e Forms | Done | `88c200f` | Auth forms and public form submit. |
| 4a Webhooks | Done | `2de8edc` | Clerk and Razorpay idempotency ledgers. |
| 4b Alerts and ops/admin | Done | `f95e784` | Backend groundwork only; no `web_v2` wiring. |
| 5 Cross-cutting validation | Done | `cf4476f` | Validation-only close-out. |

### Backend-First API Surface Continuation

| Phase | Status | Commit | Notes |
|---|---|---|---|
| Gap map and locked decisions | Done | docs only | Consolidated in `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`. |
| Implementation phase map | Done | docs only | Stored in `docs/plans/2026-05-02-api-surface-implementation-phases.md`. |
| 1 migration | Done | `01d0cae` | Phase 1 database foundation migration catch-up. |
| 1a Public trust and host models | Done | `8b8c4a3` | Trusted origins, signing secrets, hosted public-surface trust, route-aware public CORS. |
| 1b Canonical form submissions | Done | `0c9f618` | `CollectionFormSubmission` writes with rating, answers, trust, idempotency linkage. |
| 1c Testimonial private metadata | Done | `7aae66d` | Encrypted PII writes, hashed identifiers, public-submit PII removal, authenticated email compatibility shim. |
| 1d Studio drafts | Done | `c56cf68` | Shared `StudioDraft` service and form/widget `GET`/`PUT .../draft` endpoints with optimistic concurrency. |
| Phase 1 progress docs | Done | `0f14884` | Recorded Phase 1a-1d progress. |
| 1e Auxiliary product data | Pending | n/a | API keys, billing projections, notifications, analytics capture/rollups. Needs careful contract scoping before implementation. |
| 2 Common API contracts | Pending | n/a | Access block, shared DTO/client contracts, errors, idempotency, concurrency conventions. |
| 3 Public surface API | Pending | n/a | Host-aware public rendering/submission and event capture. |
| 4 Studio API | Pending | n/a | Form/widget studio persistence and explicit mappings. |
| 5 Auxiliary API surfaces | Pending | n/a | Analytics, notifications, billing read projections, API keys. |
| 6 `web_v2` adaptation | Pending | n/a | Replace mocks and adapt UI to backend-canonical contracts. |
| 7 Verification and hardening | Pending | n/a | Security, performance, migration, and end-to-end checks. |

## Operational Notes

- Public form submissions now use `CollectionFormSubmission` as the canonical answer/rating/trust record.
- New public testimonial/form writes keep email, IP, and user agent out of `Testimonial`; sensitive raw values move to encrypted private metadata with normalized hashes.
- Public submit responses omit `authorEmail`; authenticated testimonial reads rehydrate it from private metadata with a legacy row fallback.
- Draft writes require `expectedVersion`; first save uses `expectedVersion: 0`; stale writes return `409 Conflict`.
- `web_v2` still has major mock-backed surfaces and should not be treated as wired.

## Known Doc Drift

- `docs/plans/2026-05-02-api-surface-implementation-phases.md` has been annotated so its original starting point does not override this live ledger.
- `apps/api_v2/docs/orchestration/handoff.md` has been annotated so original-rebuild scope language does not override the current auxiliary-surface decisions.
- `memory/` and `docs/codex-claude-memory-migration.md` are historical context, not the live progress ledger.

## Progress Report Format

Use this shape for future updates:

```markdown
Status: [one sentence]

Completed since last checkpoint:
- [phase/subphase, commit, result]

Current work:
- [phase/subphase, owner, scope]

Next move:
- [the next concrete action]

Blockers or decisions:
- [user-owned or technical blockers]

Verification:
- [commands run and result, or exact blocker]

Doc drift:
- [docs updated or stale docs found]
```
