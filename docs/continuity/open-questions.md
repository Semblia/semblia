# Open Questions

Last updated: 2026-05-02

This file is for user-owned or architecture-sensitive questions. Do not silently decide these during implementation.

## Immediate

| Area | Question | Why It Matters | Status |
|---|---|---|---|
| Phase 1e API keys | What is the launch-minimum API key scope model? | Schema/API decisions need secure key creation, rotation, prefix/last4 display, events, and usage boundaries. | Needs user confirmation before implementation. |
| Phase 1e billing | Which source of truth should read-only billing projections use first: existing DB tables, Razorpay state, or a provider-backed sync layer? | Avoids pretending unsafe payment mutations or stale billing data are production-ready. | Needs user confirmation before implementation. |
| Phase 1e notifications | What notification types must appear in the visible bell/account notifications for v2 launch? | Determines minimal list, unread-count, mark-read, and preferences contracts. | Needs user confirmation before implementation if schema is insufficient. |
| Phase 1e analytics | Which analytics KPIs are required for launch versus later? | Event capture and rollup table design depends on visible dashboard commitments. | Needs user confirmation before implementation if current UI panels remain visible. |
| NotebookLM MCP | Should NotebookLM become part of the durable memory workflow, or remain an optional external research layer after auth is fixed? | Repo-local docs are deterministic; NotebookLM answers are LLM synthesis over uploaded sources and should not replace the canonical ledger. | Needs user preference after MCP auth/tooling is healthy. |

## Watch Items

| Area | Watch Item | Handling |
|---|---|---|
| `web_v2` wiring | Current UI mocks may diverge from backend-canonical contracts. | Track deltas explicitly; update UI to API instead of bending API to mocks. |
| Public trust | HMAC and Origin trust must stay separate. | Failed HMAC must not fall through to Origin. |
| PII | Display-safe rows must not regain sensitive public-submit metadata. | Keep private metadata writes and serializers under review. |
| Docs | Older docs still contain stale scope/start-point language. | Update `docs/continuity/progress.md` first; use `doc-map.md` to decide whether old docs need edits. |
