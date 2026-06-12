# Admin Track A1–A3 Spec (Backend)

**Date:** 2026-05-26
**Branch:** revamp/v2
**Surface:** `apps/api_v2`
**Scope:** Admin authorization primitives + Plans CRUD endpoints for the new `apps/admin` Next.js app.

## Context

We are deleting the broken `apps/admin` and replacing it with a fresh Next.js app that will be deployed to `admin.semblia.com`. To keep ops cost low and avoid premature splitting, the **admin API endpoints live in the same `api_v2` NestJS process** as customer endpoints. Process boundary is *not* the security boundary — it's a separate Clerk app (different JWKS) + DB-backed `AdminUser` lookup + per-route guards.

Identity is owned by Clerk (new `semblia-admin` Clerk application — the user is creating it now in parallel). Authorization is owned by our DB (`AdminUser` table). **Never trust Clerk metadata.** The user previously used `publicMetadata.role === "admin"` in V1 and explicitly rejected that pattern as too vague.

The customer Clerk app keeps issuing tokens for `web_v2` against the existing `User` table. The admin Clerk app issues tokens that only the admin guard will accept.

## A1 — Schema + migration

### Prisma models (add to `packages/database/prisma/schema.prisma`)

```prisma
model AdminUser {
  id              String           @id @default(cuid())
  clerkUserId     String           @unique           // from the semblia-admin Clerk app
  email           String           @unique
  isActive        Boolean          @default(true)
  grantedByEmail  String?                            // email of admin who granted; null if seed-bootstrapped
  grantedAt       DateTime         @default(now())
  revokedAt       DateTime?
  lastLoginAt     DateTime?
  notes           String?

  auditLogs       AdminAuditLog[]

  @@index([isActive])
}

model AdminAuditLog {
  id            String     @id @default(cuid())
  adminUserId   String
  action        String     @db.VarChar(64)           // e.g. "grant_admin", "create_plan", "deactivate_plan"
  targetType    String?    @db.VarChar(64)           // e.g. "plan", "admin_user"
  targetId      String?
  metadata      Json?                                 // request body, diff, etc.
  ipAddress     String?    @db.VarChar(64)
  userAgent     String?    @db.Text
  createdAt     DateTime   @default(now())

  adminUser     AdminUser  @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@index([adminUserId, createdAt])
  @@index([action, createdAt])
}
```

### Migration

`packages/database/prisma/migrations/<timestamp>_admin_auth/migration.sql` — generate via `pnpm --filter @workspace/database prisma migrate dev --name admin_auth`. Verify it cleanly applies and rolls forward.

### Seed script

`apps/api_v2/scripts/grant-admin.ts` — CLI invoked via:

```bash
pnpm --filter api_v2 admin:grant -- --email=anubhab@example.com --clerk-user-id=user_xxx
```

Behavior:
- Validates `--email` and `--clerk-user-id` flags.
- Upserts `AdminUser` with `isActive=true`, `grantedByEmail=null`.
- Writes an `AdminAuditLog` row with `action="seed_bootstrap"`.
- Idempotent: re-running with same `--clerk-user-id` is a no-op (logs "already exists").

Add `admin:grant` to `apps/api_v2/package.json` scripts as `tsx scripts/grant-admin.ts`.

**Do not auto-bootstrap from env.** Explicit script invocation only.

## A2 — Auth guard + decorator

### Env additions

Add to `apps/api_v2/.env.example` and `apps/api_v2/src/config/env.ts` schema:

```
ADMIN_CLERK_SECRET_KEY=sk_...            # admin Clerk app secret
ADMIN_CLERK_PUBLISHABLE_KEY=pk_...       # not strictly needed on api side, but document
ADMIN_CLERK_AUTHORIZED_PARTIES=https://admin.semblia.com,http://localhost:3001
ADMIN_CLERK_JWT_AUDIENCE=                # optional, leave blank if not used
```

Treat these as required only in production; optional in dev (mirror billing's pattern with Razorpay keys).

### New guard: `apps/api_v2/src/common/guards/clerk-admin-auth.guard.ts`

```ts
@Injectable()
export class ClerkAdminAuthGuard implements CanActivate {
  // Mirrors ClerkAuthGuard but uses ADMIN_CLERK_SECRET_KEY + ADMIN_CLERK_AUTHORIZED_PARTIES.
  // Does NOT support API key auth (admin routes are user-only by definition).
  // On success, attaches request.adminClerkUserId = payload.sub and request.adminActor = { clerkUserId, type: "admin_session" }.
  // Throws UnauthorizedException on invalid/missing/wrong-issuer token.
}
```

Reuse `buildClerkVerifyOptions` from `apps/api_v2/src/config/security.ts` but with the admin env vars.

### New decorator: `apps/api_v2/src/common/decorators/current-admin.decorator.ts`

```ts
export const CurrentAdmin = createParamDecorator(...);
// Returns the AdminUser row attached by AdminLookupInterceptor (see below).
// If missing, throws — caller should always be behind @UseGuards(ClerkAdminAuthGuard) + AdminLookupInterceptor.
```

### New interceptor: `apps/api_v2/src/common/interceptors/admin-lookup.interceptor.ts`

After `ClerkAdminAuthGuard` validates the token, this interceptor:
1. Looks up `AdminUser` by `request.adminClerkUserId`.
2. If not found OR `isActive=false`, throws `ForbiddenException("Admin access required")`.
3. Updates `lastLoginAt` (debounced — only if > 5 minutes since last update, to avoid write storm).
4. Attaches `request.adminUser = adminUser` for downstream decorators.

### Shorthand decorator: `@RequireAdmin()`

```ts
// apps/api_v2/src/common/decorators/require-admin.decorator.ts
export const RequireAdmin = () => applyDecorators(
  UseGuards(ClerkAdminAuthGuard),
  UseInterceptors(AdminLookupInterceptor),
);
```

Apply this at the **class level** of admin controllers (matches B7 `UserActorGuard` pattern on `BillingController`).

### Audit logging

Add `AdminAuditService` (`apps/api_v2/src/modules/admin/admin-audit.service.ts`) with one method:

```ts
async record(params: {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void>
```

Controllers call this explicitly on mutations (don't try to auto-log via interceptor — too magic, hides intent).

### Global guard interaction

`ClerkAuthGuard` is currently global (`APP_GUARD`). Admin endpoints must **opt out** of the global guard and run only `ClerkAdminAuthGuard`. Two options:

1. Mark admin routes with `@Public()` (skips global) and rely on `@RequireAdmin()` to do all the work.
2. Add an explicit `@AdminRoute()` marker that the global guard also respects.

**Pick option 1** — minimal changes, consistent with existing public-route handling.

## A3 — Admin module + endpoints

### Module structure

```
apps/api_v2/src/modules/admin/
  admin.module.ts
  admin.controller.ts        // /v2/admin/me, /v2/admin/whoami
  admin-audit.service.ts
  plans/
    admin-plans.controller.ts // /v2/admin/plans
    admin-plans.service.ts
    admin-plans.dto.ts
```

Register `AdminModule` in `app.module.ts`.

### Endpoints

All routes under `/v2/admin/*` with class-level `@RequireAdmin()` and `@Public()` (to skip global ClerkAuthGuard).

#### `GET /v2/admin/me`

Returns the current admin's profile:

```json
{
  "id": "cuid",
  "email": "anubhab@…",
  "isActive": true,
  "grantedAt": "2026-05-26T…",
  "lastLoginAt": "2026-05-26T…"
}
```

Used by the admin Next.js app's root layout to verify access before rendering.

#### `GET /v2/admin/plans`

Returns all `Plan` rows (active + inactive), shape:

```json
[{
  "id": "cuid",
  "type": "PRO",
  "name": "Pro Plan",
  "description": "…",
  "price": 99900,
  "currency": "INR",
  "interval": "month",
  "isActive": true,
  "razorpayPlanId": "plan_xxx" | null,
  "limits": { "projects": 5, "teamMembers": 2 },
  "createdAt": "…",
  "updatedAt": "…"
}]
```

#### `POST /v2/admin/plans`

Body (Zod-validated):

```ts
{
  type: "FREE" | "PRO" | "BUSINESS",                 // UserPlan enum (matches existing values in packages/database/prisma/schema.prisma)
  name: string (1..255),
  description?: string,
  price: integer (min 0),                            // smallest currency unit (paise for INR)
  currency: "INR",                                   // start with INR-only; extend later
  interval: "monthly" | "yearly",                    // matches Razorpay's allowed values
  limits: { projects: int, teamMembers: int, ... },
}
```

Behavior:
1. If `price === 0`, skip Razorpay (free plans don't need a Razorpay plan); set `razorpayPlanId=null`.
2. Else: call Razorpay `plans.create({ period: interval, interval: 1, item: { name, amount: price, currency } })`. Capture returned `id`.
3. Insert `Plan` row with `razorpayPlanId` set.
4. Record audit log: `action="create_plan"`, `targetType="plan"`, `targetId=plan.id`, `metadata={razorpayPlanId, price, type}`.
5. Return the created plan.

**Razorpay constraint:** plans are immutable. No `PATCH /plans/:id` for now. Editing means deactivating + creating a new one.

#### `POST /v2/admin/plans/:id/deactivate`

Sets `isActive=false` on the `Plan` row. **Does not delete** (existing subscriptions reference it). Records audit log.

Does NOT touch Razorpay (no "deactivate plan" on Razorpay's API; the plan stays but new subscriptions stop pointing to it).

### DTOs

Use Zod schemas in `admin-plans.dto.ts`, exposed via `@workspace/types` if `web_v2`-shareable (mirror billing's pattern).

## Verification

Codex must run and report:

```bash
cd apps/api_v2
pnpm exec tsc --noEmit
pnpm exec eslint . --ext .ts
pnpm test billing  # ensure existing billing tests still pass
pnpm test admin    # new tests for AdminAuditService + ClerkAdminAuthGuard
```

Manual smoke (Codex documents the test commands):

1. Run migration: `pnpm --filter @workspace/database prisma migrate deploy`
2. Seed admin: `pnpm --filter api_v2 admin:grant -- --email=… --clerk-user-id=user_test`
3. `curl -H "Authorization: Bearer <admin-clerk-jwt>" http://localhost:8000/v2/admin/me` returns 200
4. Same with a customer Clerk JWT → 401 (wrong issuer)
5. Same with no auth → 401
6. Same with an admin JWT for a user with `isActive=false` → 403

## Files Codex will touch

**Add:**
- `packages/database/prisma/migrations/<ts>_admin_auth/migration.sql`
- `apps/api_v2/scripts/grant-admin.ts`
- `apps/api_v2/src/common/guards/clerk-admin-auth.guard.ts`
- `apps/api_v2/src/common/guards/clerk-admin-auth.guard.spec.ts`
- `apps/api_v2/src/common/decorators/current-admin.decorator.ts`
- `apps/api_v2/src/common/decorators/require-admin.decorator.ts`
- `apps/api_v2/src/common/interceptors/admin-lookup.interceptor.ts`
- `apps/api_v2/src/modules/admin/admin.module.ts`
- `apps/api_v2/src/modules/admin/admin.controller.ts`
- `apps/api_v2/src/modules/admin/admin-audit.service.ts`
- `apps/api_v2/src/modules/admin/admin-audit.service.spec.ts`
- `apps/api_v2/src/modules/admin/plans/admin-plans.controller.ts`
- `apps/api_v2/src/modules/admin/plans/admin-plans.service.ts`
- `apps/api_v2/src/modules/admin/plans/admin-plans.dto.ts`
- `apps/api_v2/src/modules/admin/plans/admin-plans.service.spec.ts`

**Modify:**
- `packages/database/prisma/schema.prisma` (add 2 models)
- `apps/api_v2/.env.example` (4 new vars)
- `apps/api_v2/src/config/env.ts` (Zod schema for new vars)
- `apps/api_v2/src/app.module.ts` (register AdminModule)
- `apps/api_v2/package.json` (add `admin:grant` script)

## Constraints

- Single Prisma client, single DB, single NestJS process — confirmed by user.
- INR-only for plan creation in this phase. Multi-currency is future work.
- No UI work; frontend is being built in parallel against this contract.
- Follow existing patterns: Zod validation, class-level guards, service-layer business logic, controller-thin pattern.
- All new code TypeScript strict, no `any`.
- Skip `python scripts/update-indexes.py` — orchestrator will run it after merging.

## Commit

One commit per checkpoint (A1, A2, A3), conventional-commits style:

- `feat(admin): add AdminUser + AdminAuditLog tables (A1)`
- `feat(admin): add ClerkAdminAuthGuard + RequireAdmin decorator (A2)`
- `feat(admin): add /v2/admin/me + /v2/admin/plans endpoints (A3)`
