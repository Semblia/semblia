# Open Questions

Last updated: 2026-05-03

This file is for user-owned or architecture-sensitive questions. Do not silently decide these during implementation.

## Immediate

| Area | Question | Why It Matters | Status |
|---|---|---|---|
| Phase 1e API keys and agent keys | What exact scope names should launch? | The launch scope set and agent presets are implemented in V1 Task 2. Treat them as accepted unless the user explicitly reopens scope names or role presets. | Implemented; no longer blocking. |
| Phase 1e billing | Which source of truth should read-only billing projections use first: existing DB tables, Razorpay state, or a provider-backed sync layer? | Avoids pretending unsafe payment mutations or stale billing data are production-ready. | Needs user confirmation before implementation. |
| Phase 1e notifications | What notification types must appear in the visible bell/account notifications for v2 launch? | The current baseline is submission, moderation, export failure, security, and agent-action notifications. Schema/API can proceed with this baseline unless UI scope expands. | Default baseline decided; revisit only if visible UI needs more. |
| Phase 1e analytics | Which analytics KPIs are required for launch versus later? | The current baseline is form views, form submissions, widget loads, testimonial impressions, hosted page views, API requests, and agent actions. | Default baseline decided; revisit only if dashboard commitments expand. |
| V1 native integrations | Which provider should be implemented first after the generic export foundation? | The plan includes Slack, Notion, Linear, and GitHub as thin one-way exports. Provider order can be chosen by implementation risk after the shared foundation lands. | Default order: Slack, Notion, Linear, GitHub. |

## Watch Items

| Area | Watch Item | Handling |
|---|---|---|
| `web_v2` wiring | Current UI mocks may diverge from backend-canonical contracts. | Track deltas explicitly; update UI to API instead of bending API to mocks. |
| Public trust | HMAC and Origin trust must stay separate. | Failed HMAC must not fall through to Origin. |
| PII | Display-safe rows must not regain sensitive public-submit metadata. | Keep private metadata writes and serializers under review. |
| Docs | Older docs can still contain historical scope/start-point language. | Treat `docs/continuity/` as canonical; edit old docs only when they mislead current handoff behavior. |
| Feedback integrity | Agent/API/integration write surfaces must not mutate original collected feedback. | Keep source submissions immutable; allow annotations, moderation, publish state, tags, exports, and human-approved display revisions. |
