# V2 Security Audit Remediation

Date: 2026-04-29
Scope: `apps/api_v2`, `apps/web_v2`, `packages/database`

The deprecated `packages/widget` runtime is intentionally out of remediation
scope. Its sanitizer/runtime CVEs remain documented below as deferred because
the package is being replaced.

## Checklist Baseline

- OWASP API Security Top 10 2023
- OWASP Top 10 2021 component, access-control, and misconfiguration risks
- Current Clerk, NestJS, NestJS Throttler, and Razorpay webhook docs via
  Context7
- `pnpm audit --prod` filtered to V2 production dependency paths

## Remediation Status

| Finding | Severity | Status | Resolution |
| --- | --- | --- | --- |
| Critical Clerk auth package advisory | P1 | Fixed | Upgraded `@clerk/nextjs` in `apps/web_v2` and `@clerk/backend` in `apps/api_v2` to patched ranges. |
| Clerk tokens accepted without origin/audience constraints | P1 | Fixed | Added `CLERK_AUTHORIZED_PARTIES` and `CLERK_JWT_AUDIENCE` support and pass them to `verifyToken`. |
| Open V2 API CORS | P2 | Fixed | Replaced `cors: true` with explicit `API_V2_CORS_ORIGINS`, methods, and headers. |
| No server-side rate limiting | P2 | Fixed | Added global `@nestjs/throttler` and stricter public-route throttles for health, webhooks, submissions, and public embeds. |
| Razorpay webhook lacks signature verification | P2 | Fixed | Added raw-body HMAC SHA-256 verification for `X-Razorpay-Signature` before the placeholder handler runs. |
| High Next.js dependency CVE | P2 | Fixed | Upgraded `next` in `apps/web_v2` to the patched range. |
| Build CLI in production dependencies | P2 | Fixed | Moved `shadcn` from `dependencies` to `devDependencies` in `apps/web_v2`. |
| Deprecated widget sanitizer/runtime CVEs | P2 | Deferred | `packages/widget` is deprecated and excluded from this remediation. Replace rather than patch this package. |

## New Environment Variables

`apps/api_v2/.env.example` now documents:

- `API_V2_CORS_ORIGINS`: comma-separated browser origins allowed to call V2.
- `API_V2_RATE_LIMIT_TTL_SECONDS`: global rate-limit window.
- `API_V2_RATE_LIMIT_MAX`: global request count per window.
- `CLERK_AUTHORIZED_PARTIES`: comma-separated Clerk authorized party origins.
- `CLERK_JWT_AUDIENCE`: optional Clerk JWT audience or comma-separated audiences.
- `RAZORPAY_WEBHOOK_SECRET`: secret used to verify Razorpay webhook signatures.

## Follow-Up Notes

- Customer-hosted widget/embed traffic will likely need a separate CORS model
  when the replacement widget package is designed.
- The Razorpay service is still a placeholder. Keep signature verification at
  the controller boundary when real payment processing is implemented.
- Keep downstream auth checks in server handlers even after patched Clerk
  middleware upgrades; middleware should be a first gate, not the only gate.
