# Tresta V1 Auth, Integrations, And Agent Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 control plane for Clerk-backed organizations, project-scoped credentials, in/out integrations, and agent-native access while preserving immutable original feedback.

**Architecture:** Clerk owns identity, sessions, organization membership, and convenient connected-account OAuth. Tresta owns the local organization mirror, project ownership, authorization, API credentials, public surfaces, export/integration delivery, audit logs, and feedback integrity rules. The official MCP surface is an adapter over scoped private APIs, not a separate source of truth.

**Tech Stack:** NestJS 11, Prisma/Postgres, Clerk session tokens and organization claims, Zod DTO validation, BullMQ/Redis for deliveries, Node crypto HMAC signing, `@workspace/types` shared DTOs, `web_v2` Next.js UI, and a small TypeScript MCP server package for agent clients.

---

## Product Stance

Tresta v1 should feel directional, not timid:

- Easy collection through browser public surfaces and server submission.
- Clear boundaries through Clerk organizations, Tresta projects, scoped credentials, and signed events.
- Differentiating movement through inbound collection, outbound webhooks, native exports, and agent-operable management.
- Friendly UX for non-technical users: credentials are named by purpose, secrets are shown only once, and dangerous actions are visibly constrained.

The core trust principle is non-negotiable:

```text
Original submission = immutable customer feedback.
Moderation state = editable workflow state.
Presentation copy = human-approved display layer.
Private metadata = internal, audited, and scoped.
Exports = traceable delivery records.
```

Agents and API keys can organize, classify, suggest, moderate, publish/unpublish when scoped, and trigger exports. They cannot silently rewrite collected feedback, manage billing, change org membership, change owner/admin roles, delete projects, or view full secret values after creation.

## Current Repo Anchor

Start from the current backend-first continuation state:

- `docs/continuity/progress.md` is the live phase ledger.
- Phase 1a-1d are complete: public trust/host models, canonical form submissions, testimonial private metadata split, and studio drafts.
- The next original checkpoint was Phase 1e auxiliary product data.
- This plan expands Phase 1e into the v1 differentiator track: org tenancy, scoped credentials, outbound integrations, and agent access.

Before implementing any task, run:

```powershell
git status --short --branch
git log --oneline -12
```

Then read:

```text
AGENTS.md
docs/continuity/README.md
docs/continuity/progress.md
docs/continuity/decisions.md
docs/continuity/open-questions.md
docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md
```

## Phase Order

| Phase | Checkpoint | Why This Order |
|---|---|---|
| 0 | Plan and continuity checkpoint | Preserve the product stance before code starts. |
| 1 | Clerk organization and actor foundation | All project access, keys, integrations, and agents need the same tenant boundary. |
| 2 | Credential and scope system | Private API keys, agent keys, and server submit secrets need distinct authorization paths. |
| 3 | Feedback integrity and moderation boundary | Agents/integrations must not mutate original submissions. |
| 4 | Outbound webhook and export foundation | Native integrations should reuse the same event/delivery substrate. |
| 5 | Native thin integrations | Slack, Notion, Linear, and GitHub become destinations, not one-off special cases. |
| 6 | Agent access and MCP server | Agents use scoped keys over the stable private API. |
| 7 | OpenAPI and developer docs | API keys and agent access need self-serve documentation. |
| 8 | `web_v2` friendly UX | Expose the control plane without making users think in security jargon. |
| 9 | Verification and hardening | Close tenant isolation, credentials, webhook signing, and immutable feedback risks. |

## File Structure Map

### Database And Shared Types

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_v1_control_plane_credentials_integrations/migration.sql`
- Modify: `packages/types/src/v2.ts`
- Modify: `packages/types/src/index.ts`

Responsibilities:

- Add local organization mirror keyed by Clerk organization ID.
- Move project ownership toward organization scope while keeping existing `Project.userId` and `ProjectMember` compatibility during migration.
- Add credential, audit, integration, export, outbound webhook, and display-revision records.
- Publish shared DTOs for org/project access, credentials, integrations, agent access, and delivery logs.

### API Common Auth And Access

- Modify: `apps/api_v2/src/common/guards/clerk-auth.guard.ts`
- Create: `apps/api_v2/src/common/authz/actor-context.ts`
- Create: `apps/api_v2/src/common/decorators/current-actor.decorator.ts`
- Modify: `apps/api_v2/src/common/authz/capabilities.ts`
- Modify: `apps/api_v2/src/common/authz/project-access.service.ts`
- Modify: `apps/api_v2/src/common/authz/capability.guard.ts`
- Modify: `apps/api_v2/src/common/authz/*.spec.ts`

Responsibilities:

- Parse Clerk user ID and active organization claim into one request actor context.
- Use Clerk organization ID as the workspace boundary.
- Keep project access checks server-side and capability-driven.
- Support user sessions, private API keys, and agent keys through one actor model.

### Organization Module

- Create: `apps/api_v2/src/modules/organizations/organizations.module.ts`
- Create: `apps/api_v2/src/modules/organizations/organizations.controller.ts`
- Create: `apps/api_v2/src/modules/organizations/organizations.service.ts`
- Create: `apps/api_v2/src/modules/organizations/organizations.dto.ts`
- Create: `apps/api_v2/src/modules/organizations/organizations.spec.ts`
- Modify: `apps/api_v2/src/app.module.ts`

Responsibilities:

- Upsert local org mirrors from Clerk active org context.
- Expose current organization summary and project list entrypoints.
- Keep Clerk as the source of truth for membership and org switching.

### Credential Modules

- Create: `apps/api_v2/src/modules/api-keys/api-keys.module.ts`
- Create: `apps/api_v2/src/modules/api-keys/api-keys.controller.ts`
- Create: `apps/api_v2/src/modules/api-keys/api-keys.service.ts`
- Create: `apps/api_v2/src/modules/api-keys/api-keys.dto.ts`
- Create: `apps/api_v2/src/modules/api-keys/api-key-auth.guard.ts`
- Create: `apps/api_v2/src/modules/api-keys/api-key-hasher.ts`
- Create: `apps/api_v2/src/modules/api-keys/api-keys.spec.ts`
- Modify: `apps/api_v2/src/modules/projects/signing-secret.service.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.controller.ts`

Responsibilities:

- Manage private API keys for private project APIs only.
- Manage agent keys as a distinct credential kind with narrower presets.
- Keep server submit secrets under `ProjectSigningSecret`, separate from API keys.
- Record usage, last-used metadata, and revocation state.

### Feedback Integrity

- Modify: `apps/api_v2/src/modules/forms/forms.service.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.spec.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.dto.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.spec.ts`
- Create: `apps/api_v2/src/modules/testimonials/display-revisions.service.ts`
- Create: `apps/api_v2/src/modules/testimonials/display-revisions.service.spec.ts`

Responsibilities:

- Treat `CollectionFormSubmission` as the immutable source record.
- Store display-copy suggestions and approved display revisions separately from source content.
- Audit publish/unpublish/moderation actions by actor.

### Outbound Webhooks And Export Foundation

- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.module.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.controller.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.service.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.dto.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhook-signer.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.processor.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.spec.ts`
- Create: `apps/api_v2/src/modules/exports/exports.module.ts`
- Create: `apps/api_v2/src/modules/exports/exports.controller.ts`
- Create: `apps/api_v2/src/modules/exports/exports.service.ts`
- Create: `apps/api_v2/src/modules/exports/exports.dto.ts`
- Create: `apps/api_v2/src/modules/exports/export-delivery.processor.ts`
- Create: `apps/api_v2/src/modules/exports/exports.spec.ts`
- Modify: `apps/api_v2/src/app.module.ts`

Responsibilities:

- Sign Tresta outbound events with project-scoped webhook secrets.
- Queue and retry webhook/export deliveries.
- Keep delivery status, response snippets, retry counts, and failure reasons.
- Provide CSV export as the reliable baseline export.

### Native Integrations

- Create: `apps/api_v2/src/modules/integrations/integrations.module.ts`
- Create: `apps/api_v2/src/modules/integrations/integrations.controller.ts`
- Create: `apps/api_v2/src/modules/integrations/integrations.service.ts`
- Create: `apps/api_v2/src/modules/integrations/integrations.dto.ts`
- Create: `apps/api_v2/src/modules/integrations/token-providers/connected-account-token-provider.ts`
- Create: `apps/api_v2/src/modules/integrations/token-providers/clerk-connected-account-token-provider.ts`
- Create: `apps/api_v2/src/modules/integrations/providers/slack-export.provider.ts`
- Create: `apps/api_v2/src/modules/integrations/providers/notion-export.provider.ts`
- Create: `apps/api_v2/src/modules/integrations/providers/linear-export.provider.ts`
- Create: `apps/api_v2/src/modules/integrations/providers/github-export.provider.ts`
- Create: `apps/api_v2/src/modules/integrations/integrations.spec.ts`
- Modify: `apps/api_v2/src/modules/clerk/clerk.service.ts`
- Modify: `apps/api_v2/src/app.module.ts`

Responsibilities:

- Store project-scoped connection and destination config in Tresta.
- Use Clerk connected OAuth tokens where sufficient.
- Keep provider-native app/install flows behind the same token-provider interface for future replacement.
- Implement thin one-way exports, not bidirectional sync.

### Agent Access And MCP

- Create: `apps/api_v2/src/modules/agent-access/agent-access.module.ts`
- Create: `apps/api_v2/src/modules/agent-access/agent-access.controller.ts`
- Create: `apps/api_v2/src/modules/agent-access/agent-access.service.ts`
- Create: `apps/api_v2/src/modules/agent-access/agent-access.dto.ts`
- Create: `apps/api_v2/src/modules/agent-access/agent-action-audit.service.ts`
- Create: `apps/api_v2/src/modules/agent-access/agent-access.spec.ts`
- Create: `packages/tresta-mcp-server/package.json`
- Create: `packages/tresta-mcp-server/src/index.ts`
- Create: `packages/tresta-mcp-server/src/tresta-client.ts`
- Create: `packages/tresta-mcp-server/src/tools.ts`
- Create: `packages/tresta-mcp-server/src/resources.ts`
- Create: `packages/tresta-mcp-server/src/prompts.ts`
- Create: `packages/tresta-mcp-server/src/*.spec.ts`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`

Responsibilities:

- Give users a friendly "Agent access" surface over scoped agent keys.
- Provide a local stdio MCP server package that uses the private API and agent key.
- Expose safe tools/resources/prompts for agent clients.
- Log every mutating agent action.

### Web V2 UX

- Modify: `apps/web_v2/lib/api-client.ts`
- Modify: `apps/web_v2/lib/api.ts`
- Create: `apps/web_v2/app/(app)/projects/[slug]/settings/credentials/page.tsx`
- Create: `apps/web_v2/app/(app)/projects/[slug]/settings/integrations/page.tsx`
- Create: `apps/web_v2/app/(app)/projects/[slug]/settings/agent-access/page.tsx`
- Create: `apps/web_v2/components/settings/credential-card.tsx`
- Create: `apps/web_v2/components/settings/secret-created-dialog.tsx`
- Create: `apps/web_v2/components/settings/integration-destination-card.tsx`
- Create: `apps/web_v2/components/settings/agent-access-card.tsx`
- Modify: existing project settings navigation components after locating them with code search.

Responsibilities:

- Present credentials by user intent: "Browser collection", "Server submissions", "Private API", "Webhooks", and "Agent access".
- Use role presets and scope templates instead of raw scope walls as the primary UX.
- Show secrets once, store only prefix/last4/status, and give clear rotate/revoke flows.
- Keep disabled billing/member/project deletion actions outside agent/API key surfaces.

## Task 0: Continuity And Plan Checkpoint

**Files:**

- Create: `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md`
- Modify: `docs/continuity/decisions.md`
- Modify: `docs/continuity/open-questions.md`
- Modify: `docs/continuity/progress.md`
- Modify: `docs/continuity/doc-map.md`

- [x] **Step 1: Save this plan and continuity updates**

Use `apply_patch` for all docs changes.

- [x] **Step 2: Verify plan discoverability**

Run:

```powershell
rg -n "v1 auth|agent access|Clerk Organization|immutable original|outbound webhook|integration" docs/continuity docs/plans
```

Expected: matches in this plan and continuity docs.

- [x] **Step 3: Verify stale external documentation mirror cleanup remains complete**

Run:

```powershell
rg -n -i "external documentation mirror|secondary handoff store" docs -g "*.md"
```

Expected: matches only when discussing the locked `docs/continuity/` policy, not a separate durable documentation path.

- [ ] **Step 4: Commit docs checkpoint**

Run:

```powershell
git add docs/continuity docs/plans apps/api_v2/docs/orchestration/handoff.md
git commit -m "docs(v2): plan v1 control plane and agent access"
```

Expected: one docs checkpoint commit. If unrelated user changes are present, stage only the files touched by this docs checkpoint.

## Task 1: Clerk Organization And Actor Foundation

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_v1_organization_foundation/migration.sql`
- Modify: `apps/api_v2/src/common/guards/clerk-auth.guard.ts`
- Create: `apps/api_v2/src/common/authz/actor-context.ts`
- Create: `apps/api_v2/src/common/decorators/current-actor.decorator.ts`
- Modify: `apps/api_v2/src/common/authz/project-access.service.ts`
- Modify: `apps/api_v2/src/common/authz/capabilities.ts`
- Modify: `apps/api_v2/src/common/authz/capability.guard.ts`
- Create: `apps/api_v2/src/modules/organizations/*`
- Modify: `apps/api_v2/src/app.module.ts`
- Test: `apps/api_v2/src/common/authz/*.spec.ts`
- Test: `apps/api_v2/src/modules/organizations/organizations.spec.ts`

- [x] **Step 1: Add local organization model**

Schema target:

```prisma
model Organization {
  id             String    @id @default(cuid())
  clerkOrgId     String    @unique @db.VarChar(255)
  name           String    @db.VarChar(255)
  slug           String?   @db.VarChar(255)
  createdByUserId String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  createdBy User?     @relation(fields: [createdByUserId], references: [id], onDelete: SetNull)
  projects  Project[]

  @@index([slug])
  @@index([createdByUserId])
}
```

Project transition target:

```prisma
model Project {
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}
```

Keep `Project.userId` and `ProjectMember` during the transition so existing owner-scoped data still resolves.

- [x] **Step 2: Backfill existing projects safely**

Migration behavior:

```text
For each existing Project.userId:
  create one Organization with clerkOrgId = "legacy_user_<userId>"
  name = "<user email> Workspace" when email exists, otherwise "Personal Workspace"
  set Project.organizationId to that Organization.id
```

This keeps the migration deterministic without requiring live Clerk organization API calls during deploy.

- [x] **Step 3: Parse Clerk active organization into request actor**

Clerk session token v2 includes compact active organization details under the `o` claim when an organization is active:

```ts
type ClerkOrganizationClaim = {
  id: string;
  slg?: string;
  rol?: string;
  per?: string;
};
```

Create:

```ts
export type ActorType = "user" | "api_key" | "agent_key";

export type ActorContext = {
  actorType: ActorType;
  userId?: string;
  clerkOrgId?: string;
  clerkOrgSlug?: string;
  clerkOrgRole?: "admin" | "member" | string;
  projectId?: string;
  credentialId?: string;
  scopes: string[];
};
```

The guard should set both the legacy `request.user.id` and the new `request.actor`.

- [x] **Step 4: Resolve project access by active Clerk org**

Resolution order:

```text
1. If request has active clerkOrgId:
   require project.organization.clerkOrgId == actor.clerkOrgId.
2. Map Clerk org role to Tresta capabilities.
3. If no active org exists, allow legacy project owner/member access only for old data and local development.
4. Never authorize a project only by slug.
```

- [x] **Step 5: Capability map for v1**

Use this initial capability set:

```ts
export enum Capability {
  VIEW_PROJECT = "VIEW_PROJECT",
  OPERATE_PROJECT = "OPERATE_PROJECT",
  REVIEW_SUBMISSIONS = "REVIEW_SUBMISSIONS",
  PUBLISH_TESTIMONIALS = "PUBLISH_TESTIMONIALS",
  MANAGE_PUBLISH_SURFACES = "MANAGE_PUBLISH_SURFACES",
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
  MANAGE_CREDENTIALS = "MANAGE_CREDENTIALS",
  MANAGE_AGENT_ACCESS = "MANAGE_AGENT_ACCESS",
  MANAGE_PROJECT = "MANAGE_PROJECT",
  MANAGE_MEMBERS = "MANAGE_MEMBERS",
  MANAGE_BILLING = "MANAGE_BILLING",
}
```

V1 role mapping:

```text
Clerk org admin:
  all capabilities except actions explicitly disabled by route policy.

Clerk org member:
  VIEW_PROJECT, OPERATE_PROJECT, REVIEW_SUBMISSIONS, PUBLISH_TESTIMONIALS.

Legacy ProjectMember OWNER/ADMIN:
  same as Clerk org admin.

Legacy ProjectMember EDITOR:
  VIEW_PROJECT, OPERATE_PROJECT, REVIEW_SUBMISSIONS, PUBLISH_TESTIMONIALS.

Legacy ProjectMember VIEWER:
  VIEW_PROJECT.
```

- [x] **Step 6: Verify**

Run:

```powershell
pnpm.cmd --filter api_v2 test -- --run common/authz modules/organizations
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

Expected: tests and build pass; indexes update.

## Task 2: Scoped Private API Keys And Agent Keys

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_v1_api_and_agent_keys/migration.sql`
- Create: `apps/api_v2/src/modules/api-keys/*`
- Create: `apps/api_v2/src/modules/agent-access/*`
- Modify: `apps/api_v2/src/app.module.ts`
- Modify: `packages/types/src/v2.ts`
- Test: `apps/api_v2/src/modules/api-keys/api-keys.spec.ts`
- Test: `apps/api_v2/src/modules/agent-access/agent-access.spec.ts`

- [x] **Step 1: Keep credential purposes distinct**

User-facing labels:

```text
Public surface ID:
  safe to expose, used by browser collection surfaces.

Trusted domains:
  allow browser public submit from owner-approved origins.

Server submit secret:
  HMAC secret for customer backend submission.

Private API key:
  programmatic access to private project data and configuration.

Webhook signing secret:
  Tresta signs outbound events sent to the user's endpoint.

Agent key:
  scoped private API credential packaged for AI tools and MCP.
```

- [x] **Step 2: Extend API key type safely**

Current DB has `ApiKeyType.SECRET` and `ApiKeyType.PUBLISHABLE`. Keep existing rows valid and add an agent type:

```prisma
enum ApiKeyType {
  SECRET
  PUBLISHABLE
  AGENT
}
```

API behavior:

```text
SECRET:
  private API key.

AGENT:
  private API key constrained to agent-safe scopes and logged as actorType=agent_key.

PUBLISHABLE:
  legacy-compatible value only. Do not use for browser public submit in v1.
```

- [x] **Step 3: Define launch scopes**

Launch scope set:

```text
project:read
submissions:read
submissions:annotate
submissions:moderate
testimonials:read
testimonials:publish
testimonials:unpublish
testimonials:tag
testimonials:display_suggest
analytics:read
exports:read
exports:write
webhooks:read
webhooks:write
integrations:read
integrations:write
credentials:read
credentials:write
agent:read
agent:write
```

Disallowed for agent keys:

```text
billing:write
members:write
project:delete
credentials:reveal
submissions:source_write
testimonials:source_write
```

- [x] **Step 4: Implement API key routes**

Routes:

```text
GET    /v2/projects/:slug/api-keys
POST   /v2/projects/:slug/api-keys
POST   /v2/projects/:slug/api-keys/:keyId/rotate
POST   /v2/projects/:slug/api-keys/:keyId/revoke
GET    /v2/projects/:slug/api-keys/:keyId/events
```

Creation response:

```json
{
  "id": "key_...",
  "name": "Production API",
  "type": "SECRET",
  "prefix": "tsk_live_ab12cd34",
  "lastFour": "wxyz",
  "secret": "tsk_live_ab12cd34.full_secret_shown_once",
  "scopes": ["project:read", "submissions:read"],
  "createdAt": "2026-05-03T00:00:00.000Z"
}
```

List responses must never include `secret`.

- [x] **Step 5: Implement agent access routes**

Routes:

```text
GET  /v2/projects/:slug/agent-access
POST /v2/projects/:slug/agent-access/keys
POST /v2/projects/:slug/agent-access/keys/:keyId/revoke
GET  /v2/projects/:slug/agent-access/actions
```

Role presets:

```text
Read only:
  project:read, submissions:read, testimonials:read, analytics:read, exports:read, webhooks:read, integrations:read

Content manager:
  Read only + submissions:annotate, submissions:moderate, testimonials:publish, testimonials:unpublish, testimonials:tag, testimonials:display_suggest

Automation manager:
  Read only + exports:write, webhooks:write, integrations:write

Developer:
  Read only + credentials:read, credentials:write, agent:read, agent:write, webhooks:write, integrations:write
```

- [x] **Step 6: Verify**

Run:

```powershell
pnpm.cmd --filter api_v2 test -- --run modules/api-keys modules/agent-access
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

Checkpoint result (2026-05-03): implemented in `apps/api_v2` and `packages/database` with scoped private API keys, scoped agent keys, metadata-only list/event responses, one-time create/rotate secret responses, project-bound API-key auth into `ActorContext`, and agent presets. Verification passed with the full `api_v2` test suite, `api_v2` build, `update-indexes.py`, and `rebuild-graphify.py`.

Expected: tests and build pass; indexes update.

## Task 3: Immutable Feedback And Presentation Suggestions

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_v1_feedback_display_revisions/migration.sql`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.dto.ts`
- Create: `apps/api_v2/src/modules/testimonials/display-revisions.service.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.ts`
- Test: `apps/api_v2/src/modules/testimonials/*.spec.ts`
- Test: `apps/api_v2/src/modules/forms/forms.service.spec.ts`

- [ ] **Step 1: Add display revision model**

Schema target:

```prisma
enum DisplayRevisionStatus {
  SUGGESTED
  APPROVED
  REJECTED
}

model TestimonialDisplayRevision {
  id            String                @id @default(cuid())
  testimonialId String
  projectId     String
  suggestedByActorType String          @db.VarChar(32)
  suggestedByActorId   String?         @db.VarChar(255)
  status        DisplayRevisionStatus @default(SUGGESTED)
  headline      String?               @db.VarChar(255)
  displayText   String                @db.Text
  reason        String?               @db.Text
  approvedByUserId String?
  approvedAt    DateTime?
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  testimonial Testimonial @relation(fields: [testimonialId], references: [id], onDelete: Cascade)
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
  @@index([testimonialId, status])
}
```

- [ ] **Step 2: Enforce immutable source content**

Service rule:

```text
No route or service method may update CollectionFormSubmission.answers,
CollectionFormSubmission.rating, CollectionFormSubmission.author fields,
or original testimonial projection fields as an agent/API-key action.
```

Allowed operations:

```text
submissions:annotate:
  create internal notes, labels, and sentiment/classification metadata.

submissions:moderate:
  update moderation status and reason.

testimonials:display_suggest:
  create TestimonialDisplayRevision with status=SUGGESTED.

testimonials:publish:
  publish existing testimonial or approve a pending display revision when the actor is a user session with PUBLISH_TESTIMONIALS.
```

Agent rule:

```text
Agent keys can create display suggestions.
Agent keys cannot directly approve their own display text unless a future explicit automation policy enables it.
```

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm.cmd --filter api_v2 test -- --run modules/testimonials modules/forms
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

Expected: tests cover rejected source mutation, suggestion creation, human approval, and audit trail.

## Task 4: Outbound Webhooks And Export Foundation

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_v1_outbound_webhooks_exports/migration.sql`
- Create: `apps/api_v2/src/modules/outbound-webhooks/*`
- Create: `apps/api_v2/src/modules/exports/*`
- Modify: `apps/api_v2/src/app.module.ts`
- Modify: `packages/types/src/v2.ts`
- Test: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.spec.ts`
- Test: `apps/api_v2/src/modules/exports/exports.spec.ts`

- [ ] **Step 1: Add outbound webhook models**

Schema target:

```prisma
enum OutboundWebhookStatus {
  ACTIVE
  DISABLED
  REVOKED
}

enum DeliveryStatus {
  PENDING
  DELIVERING
  SUCCEEDED
  FAILED
  EXHAUSTED
}

model OutboundWebhookEndpoint {
  id              String                @id @default(cuid())
  projectId       String
  name            String                @db.VarChar(255)
  url             String                @db.VarChar(2000)
  signingSecretEncrypted String         @db.Text
  signingSecretHash      String?        @db.VarChar(128)
  subscribedEvents String[]             @default([])
  status          OutboundWebhookStatus @default(ACTIVE)
  lastSuccessAt   DateTime?
  lastFailureAt   DateTime?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, status])
}

model OutboundWebhookDelivery {
  id          String         @id @default(cuid())
  endpointId  String
  projectId   String
  eventType   String         @db.VarChar(120)
  payload     Json
  status      DeliveryStatus @default(PENDING)
  attempts    Int            @default(0)
  nextAttemptAt DateTime?
  responseStatus Int?
  responseBodySnippet String? @db.Text
  error       String?        @db.Text
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([endpointId, status])
  @@index([projectId, createdAt])
}
```

- [ ] **Step 2: Add export models**

Schema target:

```prisma
enum ExportDestinationProvider {
  CSV
  WEBHOOK
  SLACK
  NOTION
  LINEAR
  GITHUB
}

model ExportDestination {
  id          String                    @id @default(cuid())
  projectId   String
  provider    ExportDestinationProvider
  name        String                    @db.VarChar(255)
  config      Json
  status      String                    @default("ACTIVE")
  createdAt   DateTime                  @default(now())
  updatedAt   DateTime                  @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, provider])
  @@index([projectId, status])
}

model ExportRule {
  id            String   @id @default(cuid())
  projectId     String
  destinationId String
  name          String   @db.VarChar(255)
  eventTypes    String[] @default([])
  filter        Json?
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([projectId, enabled])
  @@index([destinationId])
}

model ExportDelivery {
  id            String         @id @default(cuid())
  projectId     String
  destinationId String
  ruleId        String?
  eventType     String         @db.VarChar(120)
  payload       Json
  status        DeliveryStatus @default(PENDING)
  attempts      Int            @default(0)
  error         String?        @db.Text
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([projectId, createdAt])
  @@index([destinationId, status])
}
```

- [ ] **Step 3: Define event catalogue**

Launch events:

```text
submission.created
submission.moderated
testimonial.approved
testimonial.published
testimonial.unpublished
export.delivery_failed
agent.action_created
```

- [ ] **Step 4: Implement webhook signing**

Headers:

```text
X-Tresta-Event: testimonial.published
X-Tresta-Delivery: del_...
X-Tresta-Timestamp: 2026-05-03T00:00:00.000Z
X-Tresta-Signature: v1=<hex_hmac_sha256>
```

Signature input:

```text
<timestamp>.<raw_body>
```

- [ ] **Step 5: Implement CSV export baseline**

Routes:

```text
POST /v2/projects/:slug/exports/csv
GET  /v2/projects/:slug/exports/deliveries
GET  /v2/projects/:slug/exports/deliveries/:deliveryId
```

CSV export must use display-safe testimonial fields and must not include private metadata unless a future private export scope explicitly allows it.

- [ ] **Step 6: Verify**

Run:

```powershell
pnpm.cmd --filter api_v2 test -- --run modules/outbound-webhooks modules/exports
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

Expected: tests cover HMAC signature generation, retry state transitions, event filtering, and PII-safe CSV output.

## Task 5: Native Thin Integrations

**Files:**

- Create: `apps/api_v2/src/modules/integrations/*`
- Modify: `apps/api_v2/src/modules/clerk/clerk.service.ts`
- Modify: `apps/api_v2/src/app.module.ts`
- Modify: `packages/types/src/v2.ts`
- Test: `apps/api_v2/src/modules/integrations/integrations.spec.ts`

- [ ] **Step 1: Add integration connection model**

Schema target:

```prisma
enum IntegrationProvider {
  SLACK
  NOTION
  LINEAR
  GITHUB
}

enum IntegrationAuthStrategy {
  CLERK_OAUTH
  NATIVE_OAUTH
  MANUAL_SECRET
}

model IntegrationConnection {
  id              String                  @id @default(cuid())
  projectId       String
  provider        IntegrationProvider
  authStrategy    IntegrationAuthStrategy
  connectedByUserId String?
  clerkProvider   String?                 @db.VarChar(120)
  externalAccountId String?               @db.VarChar(255)
  status          String                  @default("ACTIVE")
  scopes          String[]                @default([])
  config          Json?
  lastCheckedAt   DateTime?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, provider])
  @@index([projectId, status])
}
```

- [ ] **Step 2: Implement token provider boundary**

Interface:

```ts
export type ConnectedAccountTokenRequest = {
  userId: string;
  provider: "slack" | "notion" | "linear" | "github";
  requiredScopes: string[];
};

export type ConnectedAccountToken = {
  accessToken: string;
  expiresAt?: Date;
  scopes: string[];
};

export interface ConnectedAccountTokenProvider {
  getToken(request: ConnectedAccountTokenRequest): Promise<ConnectedAccountToken>;
}
```

Initial implementation:

```text
ClerkConnectedAccountTokenProvider:
  asks Clerk for the connected provider token server-side.
  returns a typed token result.
  throws a connect-required error when the token is missing or revoked.
```

- [ ] **Step 3: Implement thin provider exports**

Launch behavior:

```text
Slack:
  post approved/published testimonial summary to selected channel.

Notion:
  create a page/database row for an approved testimonial.

Linear:
  create an issue from negative/flagged feedback or selected submission.

GitHub:
  create an issue from selected feedback or testimonial workflow event.
```

No v1 bidirectional sync:

```text
Do not import remote edits back into Tresta.
Do not sync project membership from providers.
Do not depend on provider webhooks for core Tresta state.
```

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm.cmd --filter api_v2 test -- --run modules/integrations modules/exports
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

Expected: provider tests mock external APIs and verify config mapping, missing-token handling, delivery creation, and safe payloads.

## Task 6: Agent Access And MCP Server

**Files:**

- Create: `apps/api_v2/src/modules/agent-access/*`
- Create: `packages/tresta-mcp-server/*`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `packages/types/src/v2.ts`
- Test: `apps/api_v2/src/modules/agent-access/agent-access.spec.ts`
- Test: `packages/tresta-mcp-server/src/*.spec.ts`

- [ ] **Step 1: Implement agent-safe private API routes**

Agent-safe routes must be wrappers over existing project APIs or new narrow endpoints:

```text
GET  /v2/projects
GET  /v2/projects/:slug
GET  /v2/projects/:slug/submissions
GET  /v2/projects/:slug/testimonials
POST /v2/projects/:slug/submissions/:submissionId/annotations
POST /v2/projects/:slug/submissions/:submissionId/moderation
POST /v2/projects/:slug/testimonials/:testimonialId/display-suggestions
POST /v2/projects/:slug/testimonials/:testimonialId/publish
POST /v2/projects/:slug/testimonials/:testimonialId/unpublish
GET  /v2/projects/:slug/analytics/summary
GET  /v2/projects/:slug/exports/deliveries
POST /v2/projects/:slug/exports/:destinationId/trigger
GET  /v2/projects/:slug/outbound-webhooks/deliveries
```

Every mutating route called by an agent key must write an audit event.

- [ ] **Step 2: Create MCP server package**

`packages/tresta-mcp-server` runs as a local stdio MCP server and calls Tresta APIs with:

```text
TRESTA_API_BASE_URL
TRESTA_AGENT_KEY
```

It must not connect directly to the database.

- [ ] **Step 3: Expose MCP tools**

Initial tools:

```text
tresta_list_projects
tresta_get_project
tresta_list_recent_submissions
tresta_get_submission
tresta_annotate_submission
tresta_moderate_submission
tresta_list_testimonials
tresta_suggest_testimonial_display
tresta_publish_testimonial
tresta_unpublish_testimonial
tresta_get_project_analytics
tresta_list_export_destinations
tresta_trigger_export
tresta_list_delivery_failures
```

Excluded tools:

```text
delete_project
manage_billing
invite_member
remove_member
change_member_role
reveal_secret
rewrite_submission
rewrite_original_testimonial
```

- [ ] **Step 4: Expose MCP resources**

Initial resources:

```text
tresta://projects
tresta://projects/{slug}/summary
tresta://projects/{slug}/submissions/recent
tresta://projects/{slug}/testimonials
tresta://projects/{slug}/delivery-failures
```

- [ ] **Step 5: Expose MCP prompts**

Initial prompts:

```text
review_recent_feedback
prepare_testimonial_candidates
debug_project_collection_setup
summarize_delivery_failures
```

- [ ] **Step 6: Verify**

Run:

```powershell
pnpm.cmd --filter api_v2 test -- --run modules/agent-access
pnpm.cmd --filter @workspace/tresta-mcp-server test
pnpm.cmd --filter @workspace/tresta-mcp-server build
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

Expected: MCP package tests pass with mocked API responses; API build passes; indexes update.

## Task 7: OpenAPI And Developer-Facing Contracts

**Files:**

- Modify: `apps/api_v2/src/main.ts`
- Modify: `apps/api_v2/src/modules/**/*.dto.ts`
- Modify: `packages/types/src/v2.ts`
- Create: `docs/api/v1-credential-model.md`
- Create: `docs/api/v1-agent-access.md`
- Create: `docs/api/v1-webhooks.md`
- Create: `docs/api/v1-integrations.md`

- [ ] **Step 1: Document credential model**

Docs must explain:

```text
Browser collection:
  public surface ID + trusted domain.

Server submission:
  server submit secret + HMAC.

Private API:
  private API key + scopes.

Outbound webhooks:
  webhook signing secret used by receivers to verify Tresta.

Agent access:
  agent key + MCP server over private API.
```

- [ ] **Step 2: Document webhook verification**

Include:

```text
Header names.
Signature input.
Example verification code.
Replay window recommendation.
Retry semantics.
Event catalogue.
```

- [ ] **Step 3: Document agent setup**

Include a generated MCP config shape:

```json
{
  "mcpServers": {
    "tresta": {
      "command": "npx",
      "args": ["@workspace/tresta-mcp-server"],
      "env": {
        "TRESTA_API_BASE_URL": "https://api.tresta.app/v2",
        "TRESTA_AGENT_KEY": "tresta_agent_..."
      }
    }
  }
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm.cmd build --filter api_v2
rg -n "Public surface ID|Server submit secret|Agent access|X-Tresta-Signature" docs/api docs/plans docs/continuity
python scripts/update-indexes.py
```

Expected: build passes; docs contain all credential terms; indexes update.

## Task 8: Web V2 Friendly Control Plane UX

**Files:**

- Modify: `apps/web_v2/lib/api-client.ts`
- Modify: `apps/web_v2/lib/api.ts`
- Create: `apps/web_v2/app/(app)/projects/[slug]/settings/credentials/page.tsx`
- Create: `apps/web_v2/app/(app)/projects/[slug]/settings/integrations/page.tsx`
- Create: `apps/web_v2/app/(app)/projects/[slug]/settings/agent-access/page.tsx`
- Create: `apps/web_v2/components/settings/credential-card.tsx`
- Create: `apps/web_v2/components/settings/secret-created-dialog.tsx`
- Create: `apps/web_v2/components/settings/integration-destination-card.tsx`
- Create: `apps/web_v2/components/settings/agent-access-card.tsx`

- [ ] **Step 1: Replace raw security jargon with intent labels**

Use these visible sections:

```text
Collect in the browser
  Trusted domains and public collection surfaces.

Submit from your backend
  Server submit secret and HMAC setup.

Use the private API
  Scoped private API keys.

Send events out
  Webhook endpoints and signing secrets.

Connect tools
  Slack, Notion, Linear, GitHub, CSV.

Let agents help
  Agent keys and MCP setup.
```

- [ ] **Step 2: Secret creation UX**

Rules:

```text
Show secret exactly once.
After closing dialog, show prefix, last four, status, created date, last used date.
Rotate creates a new secret and disables or revokes the previous version according to the API response.
Revoke requires confirmation.
```

- [ ] **Step 3: Agent access UX**

Preset copy:

```text
Read only:
  Let an agent inspect your project and summarize progress.

Content manager:
  Let an agent review submissions, suggest display copy, and publish approved testimonials.

Automation manager:
  Let an agent manage exports and webhook delivery.

Developer:
  Let an agent help wire Tresta into your app.
```

- [ ] **Step 4: Verify**

Run:

```powershell
cd apps/web_v2
pnpm.cmd exec tsc --noEmit
pnpm.cmd exec eslint . --ext .ts,.tsx
cd ..\..
pnpm.cmd build --filter web_v2
python scripts/update-indexes.py
```

Expected: typecheck, lint, build, and index update pass.

## Task 9: Verification And Hardening

**Files:**

- Modify or create targeted tests under `apps/api_v2/src/**/*.spec.ts`
- Modify or create targeted tests under `apps/web_v2/**/*.test.tsx`
- Create: `docs/verification/2026-05-v1-control-plane-verification.md`

- [ ] **Step 1: Security verification**

Run targeted checks for:

```text
Clerk org A cannot access org B project.
Legacy owner/member fallback cannot bypass active Clerk org mismatch.
Private API key cannot call public submit trust routes as trust evidence.
Agent key cannot call billing/member/project deletion routes.
Agent key cannot mutate source submission content.
Failed server-submit HMAC never falls through to browser Origin trust.
Outbound webhook signatures fail on modified body, timestamp, or secret.
Webhook delivery never includes private metadata by default.
```

- [ ] **Step 2: Contract verification**

Run:

```powershell
pnpm.cmd --filter api_v2 test
pnpm.cmd build --filter api_v2
pnpm.cmd --filter @workspace/types build
```

Expected: all API and type package checks pass.

- [ ] **Step 3: Web verification**

Run:

```powershell
cd apps/web_v2
pnpm.cmd exec tsc --noEmit
pnpm.cmd exec eslint . --ext .ts,.tsx
cd ..\..
pnpm.cmd build --filter web_v2
```

Expected: typecheck, lint, and build pass.

- [ ] **Step 4: MCP smoke verification**

Run the MCP package against a mocked API first, then against local `api_v2` with a generated agent key:

```powershell
pnpm.cmd --filter @workspace/tresta-mcp-server test
pnpm.cmd --filter @workspace/tresta-mcp-server build
```

Manual probe questions for a local MCP client:

```text
List my Tresta projects.
Show recent submissions for this project.
Suggest which submissions are publish-worthy.
Create a display suggestion for this testimonial.
Show failed webhook or export deliveries.
```

Expected: read-only probes work with read-only key; mutating probes fail without the required agent scope; source rewrite requests are rejected.

- [ ] **Step 5: Index and continuity close-out**

Run:

```powershell
python scripts/update-indexes.py
git status --short --branch
```

Update:

```text
docs/continuity/progress.md
docs/continuity/decisions.md
docs/continuity/open-questions.md
docs/continuity/doc-map.md
```

Expected: live docs reflect completed phases and any deferred decisions.

## Acceptance Criteria

V1 control plane is ready when all of the following are true:

- A Clerk organization maps to a local Tresta organization.
- One Clerk organization can own multiple Tresta projects.
- Project authorization is enforced by active Clerk organization plus backend capabilities.
- Browser public submit uses public surface/trusted origin trust only.
- Server submit uses HMAC server submit secrets only.
- Private API keys are scoped, hashed, revocable, and project-bound.
- Agent keys are scoped, hashed, revocable, project-bound, and audited.
- Original submissions remain immutable after collection.
- Agents can suggest display edits but cannot silently rewrite original feedback.
- Outbound webhooks are signed, queued, retried, and logged.
- CSV export works as the baseline export path.
- Slack, Notion, Linear, and GitHub have thin one-way export providers behind a shared integration interface.
- MCP server can inspect and manage safe project workflows through the private API.
- `web_v2` presents credentials, integrations, and agent access in human-friendly language.
- API, type, MCP, and web verification commands pass.

## Implementation Notes For Orchestrators

- Do not delegate business or architecture decisions. The decisions in `docs/continuity/decisions.md` are the current authority.
- Delegate bounded implementation slices only after the phase file list is stable.
- Subagents should not commit.
- After any source change in `apps/api_v2`, `apps/web_v2`, or `packages`, run `python scripts/update-indexes.py`.
- Use `pnpm.cmd` on Windows.
- Commit each named phase or subphase after orchestrator review and verification.
