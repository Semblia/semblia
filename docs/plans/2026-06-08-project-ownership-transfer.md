# Project Ownership Transfer — Design & Implementation Plan

Date: 2026-06-08
Branch: `revamp/v2`
Status: Approved policy; backend delegated to Codex, UI owned by Claude.

## 1. Problem

Settings → Danger zone has a disabled **Transfer ownership** row ("Coming
soon"). We want a real, non-lackluster transfer flow modeled on how mature
tools (GitHub, Vercel) hand over ownership.

## 2. Industry grounding

- **GitHub** (strongest model): initiator must have admin; types the repo
  name to confirm; recipient gets a request and must **explicitly accept**
  within a bounded window (1 day) or it **expires**; original owner is kept on
  as a collaborator (not orphaned). Two-party handshake.
- **Vercel**: weaker "promote a second owner, then they demote you" — no
  atomic guarantee, no handshake. Rejected.
- **Stripe**: no transfer at all. Rejected.

We adopt the GitHub two-party handshake with an explicit accept + expiry, and
keep the former owner on with reduced access.

## 3. Locked policy decisions (confirmed with product owner 2026-06-08)

1. **Recipient scope:** existing project member only. The new owner is chosen
   from the current member list. (Outsiders: invite them as a member first,
   then transfer.)
2. **Former owner after accept:** demoted to **ADMIN** (keeps management
   access, no lockout; new owner can remove later).
3. **Accept window:** **72 hours**, then auto-expire (PENDING → EXPIRED),
   mirroring the member-invite expiry sweep.
4. **Confirm strength:** initiator must type the exact **project name** to arm
   the action (enforced server-side too); recipient accepts with one explicit
   click. No password re-auth, no recipient re-type.

## 4. Model facts this builds on

- `Project.userId` is the canonical **primary owner** pointer (separate from
  `ProjectMember` rows). `getEffectiveRole` already treats `project.userId ===
  userId` as OWNER.
- Multiple `ProjectMember` rows may have role OWNER; OWNER and ADMIN map to the
  same capability set (`clerkOrgRoleCapabilities("admin")`). So "ownership" is
  the `Project.userId` pointer + the OWNER designation + last-owner guards.
- **Billing is account-level** (`Subscription` → `Plan`, scoped to the user),
  NOT per-project. Transferring a project does **not** move any billing. State
  this in the UI.
- Existing reusable handshake infra: `ProjectMemberInvite` (PENDING/ACCEPTED/
  REVOKED/EXPIRED + `expiresAt` default via `dbgenerated` + partial unique
  index on PENDING), `actionAudit.recordWith(tx, …)`, `notificationsService
  .createForUsers / .createForProjectManagers`, and the
  `me/project-invites/:id/accept` self-service controller pattern.

## 5. Authority model

- **Only the primary owner** (`Project.userId === currentUserId`) may initiate
  or cancel a transfer. A non-primary OWNER member cannot. This keeps a single
  canonical authority for the most destructive account action.
- Expose this to the client by adding **`isPrimaryOwner: boolean`** to
  `V2ProjectAccessDTO` (populated wherever project access is built — the
  builder already has `project.userId`).

## 6. Data model (Prisma)

New model + enum in `packages/database/prisma/schema.prisma`:

```prisma
enum ProjectOwnershipTransferStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
  EXPIRED
}

model ProjectOwnershipTransfer {
  id                String                         @id @default(cuid())
  projectId         String
  fromUserId        String   // primary owner at initiation time
  toUserId          String   // recipient (must be a member)
  status            ProjectOwnershipTransferStatus @default(PENDING)
  initiatedByUserId String?
  respondedByUserId String?
  respondedAt       DateTime?
  expiresAt         DateTime @default(dbgenerated("(now() + interval '72 hours')"))
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  fromUser   User    @relation("ProjectOwnershipTransferFrom", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser     User    @relation("ProjectOwnershipTransferTo",   fields: [toUserId],   references: [id], onDelete: Cascade)

  // At most one pending transfer per project.
  @@unique([projectId], map: "ProjectOwnershipTransfer_pending_project_key", where: raw("\"status\" = 'PENDING'::\"ProjectOwnershipTransferStatus\""))
  @@index([projectId])
  @@index([toUserId, status])
  @@index([fromUserId])
}
```

Add the back-relations to `Project` and `User`. NOTE: local migration drift
exists in this checkout (see `docs/continuity/progress.md`) — if `prisma
migrate dev` fails on drift, hand-author the migration SQL under
`packages/database/prisma/migrations/<timestamp>_project_ownership_transfer/
migration.sql` and verify with `generate` + `prisma validate` (the pattern used
for `20260602120000_submission_moderation_runs`).

## 7. API contract

### Management routes (project-scoped), in the projects module

- `GET /v2/projects/:slug/ownership-transfer`
  → `V2ProjectOwnershipTransferDTO | null` (the current PENDING transfer, after
  an inline expiry sweep). Capability: `VIEW_PROJECT`.
- `POST /v2/projects/:slug/ownership-transfer`
  Body: `{ toUserId: string; confirmName: string }`.
  Authority: **primary owner only** (`project.userId === userId`) — 403
  otherwise. Validates: `confirmName === project.name` (else 422);
  `toUserId !== project.userId` (else 422 self-transfer); recipient is an
  existing `ProjectMember` and a real user (else 404/422); no existing PENDING
  transfer (else 409). Creates the row (status PENDING), audits
  `project.ownership_transfer_requested`, notifies the recipient
  (`PROJECT_TRANSFER_REQUESTED`). Returns the DTO.
- `DELETE /v2/projects/:slug/ownership-transfer`
  Cancels the current PENDING transfer. Authority: primary owner only. Audits
  `project.ownership_transfer_cancelled`, notifies the recipient
  (`PROJECT_TRANSFER_CANCELLED`). Idempotent if already resolved.

### Recipient self-service routes, mirroring `ProjectInvitesController`

`@Controller("me/project-transfers")`:

- `GET /v2/me/project-transfers`
  → `V2ProjectOwnershipTransferDTO[]` PENDING transfers addressed to the
  current user (post expiry-sweep). Drives the recipient's incoming card.
- `POST /v2/me/project-transfers/:transferId/accept`
  Guards: transfer exists, addressed to this user (`toUserId === userId` else
  403), status PENDING (else 409), not expired (else mark EXPIRED + 409).
  In one `$transaction`:
  - `Project.userId = toUserId`
  - upsert recipient `ProjectMember` role = OWNER
  - upsert former owner (`fromUserId`) `ProjectMember` role = ADMIN (create the
    row if the former owner only existed via `Project.userId`)
  - transfer → ACCEPTED (`respondedByUserId`, `respondedAt`)
  - audit `project.ownership_transfer_accepted`
  - notify former owner + project managers (`PROJECT_TRANSFER_ACCEPTED`)
  Returns the accepted DTO (+ optionally the updated project).
- `POST /v2/me/project-transfers/:transferId/decline`
  Guards as above. Transfer → DECLINED; audit
  `project.ownership_transfer_declined`; notify the initiator
  (`PROJECT_TRANSFER_DECLINED`). Returns the DTO.

### Expiry sweep

Add `expirePendingTransfers*` helpers mirroring `expirePendingInvitesForProject`
and call them at the start of the GET reads (project + me). A worker sweep is
optional; lazy sweep on read is sufficient for launch.

## 8. Shared types (`packages/types/src/v2.ts`)

- `export type V2ProjectOwnershipTransferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";`
- `V2ProjectOwnershipTransferDTO`:
  ```ts
  interface V2ProjectOwnershipTransferUserDTO { id: string; email: string; firstName: string | null; lastName: string | null; avatar: string | null; }
  interface V2ProjectOwnershipTransferDTO {
    id: string;
    projectId: string;
    projectSlug: string;
    projectName: string;
    fromUser: V2ProjectOwnershipTransferUserDTO;
    toUser: V2ProjectOwnershipTransferUserDTO;
    status: V2ProjectOwnershipTransferStatus;
    expiresAt: string;
    createdAt: string;
    respondedAt: string | null;
  }
  ```
- Add to `V2NotificationType`: `PROJECT_TRANSFER_REQUESTED`,
  `PROJECT_TRANSFER_ACCEPTED`, `PROJECT_TRANSFER_DECLINED`,
  `PROJECT_TRANSFER_CANCELLED`. Update any
  `Record<V2NotificationType, …>` preference defaults + the api-side
  `NotificationType` enum / preference map accordingly.
- Add `isPrimaryOwner: boolean` to `V2ProjectAccessDTO`.

## 9. Audit action strings (new)

`project.ownership_transfer_requested`, `project.ownership_transfer_accepted`,
`project.ownership_transfer_declined`, `project.ownership_transfer_cancelled`.
(UI maps these to icons — see §11.)

## 10. Edge cases

- Self-transfer → 422. confirmName mismatch → 422. Non-member recipient → 422.
- Second initiate while one is PENDING → 409.
- Expired on accept/decline → mark EXPIRED, 409.
- Former owner had no `ProjectMember` row (only `Project.userId`) → create the
  ADMIN row on accept.
- Project deleted → transfers cascade.
- Last-owner guard: unaffected — accept always yields exactly one new OWNER and
  the former owner stays as ADMIN, so `countOwners` never drops to 0.

## 11. UI plan (web_v2 — owned by Claude)

Design system: Quiet Precision tokens + shared primitives
(`components/shared`), Phosphor icons, `sonner` toasts, app `/v2/` hooks only.
Use the design skills (emil-design-eng / polish) and the per-surface rework
workflow; record artifacts under `docs/ui-rework/2026-06-08-ownership-transfer/`.

1. **Initiator — Settings → Danger zone** (`components/settings/danger-client.tsx`)
   - Gate on `project.access.isPrimaryOwner`.
   - No pending transfer: replace the disabled row with an active **Transfer
     ownership** action opening `TransferOwnershipDialog`
     (`components/settings/shared/`): recipient `Select` over project members
     (exclude primary owner; show name · email · role), warning copy, billing
     note, **type-the-project-name** confirm input that arms the Transfer
     button. Calls the initiate hook; toast on success.
   - Pending transfer: the row becomes a status block — "Waiting for {name} to
     accept · expires {relative}" with a **Cancel transfer** action.
   - Non-primary-owner OWNER/ADMIN: hide the transfer row (Delete stays).
2. **Recipient — `/projects` list** (`components/projects/projects-client.tsx`)
   - `useMyProjectTransfers()` → if any, render an **incoming transfer** card
     at the top: "{initiator} wants you to take ownership of {project}" with
     **Review** → dialog showing what changes (you become Owner; they stay as
     Admin; billing stays on their account) and **Accept** / **Decline**.
   - This surface is reachable by any member regardless of project role.
3. **Notifications** (`lib/notification-utils.tsx`) — icon + tone for the 4 new
   `V2NotificationType`s; links route to `/projects` (recipient) or
   `/projects/:slug/settings/danger` (initiator side).
4. **Activity** (`components/.../audit-event-item.tsx`) — icon mapping for the
   4 new action strings (reuse the per-action icon pattern from `4744b9a`).

### New web client + hooks

- `lib/semblia-api.ts`: `fetchProjectOwnershipTransfer(slug)`,
  `initiateProjectOwnershipTransfer(slug, body)`,
  `cancelProjectOwnershipTransfer(slug)`, `fetchMyProjectTransfers()`,
  `acceptProjectTransfer(id)`, `declineProjectTransfer(id)`.
- `hooks/api`: matching query/mutation hooks + query keys
  (`projects.ownershipTransfer(slug)`, `me.projectTransfers`) with invalidation
  of project + members + notifications on mutation.

## 12. Verification gates

- Backend (Codex): `@workspace/types` build; api_v2 `typecheck` + `lint` +
  `test` (extend projects specs with transfer cases) + `nest build`; database
  `generate` + `prisma validate` + `build`.
- UI (Claude): `tsc --noEmit`, `eslint . --ext .ts,.tsx`, Vitest (new
  danger/transfer + projects-incoming tests), `pnpm build --filter web_v2`,
  `python scripts/update-indexes.py`.
