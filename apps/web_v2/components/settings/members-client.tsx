"use client";

/**
 * MembersClient — who can reach this project, and at what level.
 *
 * This surface carried five hand-rolled bordered containers inside
 * `SettingsSection` — a card per member, a card per invite, a card around the
 * invite form, and two dashed "empty" boxes. `SettingsSection` *is* the card,
 * so every one of those was the cards-on-cards defect. They are hairline
 * dividers now, and the empties are designed states rather than a centred
 * sentence in a dashed box.
 *
 * The other two fixes are about honesty:
 *   • `members.isLoading ? … : members.data?.length ? … : "No members yet."`
 *     told the owner their project had no members after a failed request.
 *     `DataState` derives error first, so that is no longer expressible — and
 *     membership reads need VIEW_PROJECT while writes need MANAGE_MEMBERS, so
 *     the permission-denied state is a real one the API can return.
 *   • removing or demoting the last owner is rejected server-side. The row used
 *     to offer it and show a red toast afterwards; it is now disabled with the
 *     reason in place.
 *
 * Both endpoints return the project's full membership in one array — there is
 * no paginated envelope to render an affordance from.
 */

import * as React from "react";
import { toast } from "sonner";
import type {
  V2ProjectDTO,
  V2ProjectMemberDTO,
  V2ProjectMemberInviteDTO,
  V2ProjectMemberRole,
} from "@workspace/types";
import {
  PlusIcon,
  TrashIcon,
  EnvelopeSimpleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataList,
  DataState,
  EmptyState,
  ItemRow,
  ListSkeleton,
  PageBody,
  SettingsSection,
  StatusBadge,
  useDataState,
  type StatusMeta,
} from "@/components/shared";
import {
  useProjectMembers,
  useUpdateProjectMember,
  useRemoveProjectMember,
  useProjectMemberInvites,
  useCreateProjectMemberInvite,
  useRevokeProjectMemberInvite,
} from "@/hooks/api";
import { fmtDateTime, humanizeLabel, timeAgo } from "@/lib/format";
import {
  canManageMembers,
  projectRoleLabel as roleLabel,
  validateInviteEmail,
} from "./shared/normalize";

const ROLE_OPTIONS: { value: V2ProjectMemberRole; label: string }[] = (
  ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const
).map((value) => ({ value, label: roleLabel(value) }));

// Inviting an OWNER is rejected by the backend — keep this list to roles the
// invite endpoint accepts so the UI never offers an impossible choice.
const INVITE_ROLE_OPTIONS: { value: V2ProjectMemberRole; label: string }[] =
  ROLE_OPTIONS.filter((opt) => opt.value !== "OWNER");

const LAST_OWNER_REASON =
  "A project must keep at least one owner. Promote someone else first.";

function memberName(member: V2ProjectMemberDTO): string {
  return (
    [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
    member.user.email
  );
}

function MemberAvatar({ member }: { member: V2ProjectMemberDTO }) {
  const initials =
    (member.user.firstName?.[0] ?? "") + (member.user.lastName?.[0] ?? "");
  const display =
    initials.toUpperCase() || member.user.email[0]?.toUpperCase() || "?";
  if (member.user.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.user.avatar}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-xs font-semibold text-brand"
      aria-hidden
    >
      {display}
    </span>
  );
}

function MemberRow({
  member,
  canManage,
  isLastOwner,
  onRoleChange,
  onRemove,
  busy,
}: {
  member: V2ProjectMemberDTO;
  canManage: boolean;
  /** The project's only owner — the API refuses to demote or remove them. */
  isLastOwner: boolean;
  onRoleChange: (role: V2ProjectMemberRole) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const displayName = memberName(member);
  const locked = isLastOwner;

  return (
    <ItemRow
      // `DataList` renders `role="list"`; without `listitem` on the row the
      // list has no items to assistive technology and the row's `aria-label`
      // is dropped with it. Every other row on this system passes it.
      role="listitem"
      padding="dense"
      // `ItemShell` shape="row" hard-codes its own bottom hairline, which would
      // double up with the `divide-y` DataList already draws.
      className="border-b-0"
      aria-label={displayName}
      leading={<MemberAvatar member={member} />}
      title={
        <span className="truncate text-sm font-medium text-foreground">
          {displayName}
        </span>
      }
      subtitle={
        <p className="truncate text-xs text-muted-foreground">
          {member.user.email}
        </p>
      }
      trailing={
        canManage ? (
          <div className="flex items-center gap-2">
            <Select
              value={member.role}
              onValueChange={(v) => onRoleChange(v as V2ProjectMemberRole)}
              disabled={busy || locked}
            >
              <SelectTrigger
                className="h-8 w-28 text-xs"
                aria-label={`Role for ${displayName}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Verb + Noun: a bare "Remove" loses its object once the row
                scrolls past its heading. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={busy || locked}
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="size-3.5" aria-hidden />
              Remove member
            </Button>
          </div>
        ) : (
          // One badge per row: the role is the signal.
          <StatusBadge label={roleLabel(member.role)} tone="neutral" />
        )
      }
      actions={
        canManage && locked ? (
          <p className="text-xs text-muted-foreground">{LAST_OWNER_REASON}</p>
        ) : undefined
      }
    />
  );
}

/**
 * Expiry is rendered from the invite's own timestamp, guarded: an unparseable
 * `expiresAt` must not reach the DOM as "Expires in NaNd".
 */
function inviteExpiry(value: string): string | null {
  const expires = new Date(value).getTime();
  if (!Number.isFinite(expires)) return null;
  const diffMs = expires - Date.now();
  if (diffMs <= 0) return "expired";
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `expires in ${hours}h`;
  return `expires in ${Math.ceil(hours / 24)}d`;
}

/**
 * The endpoint only returns PENDING invites today, but the badge is derived
 * rather than hard-coded: if that filter ever widens, the row must not label an
 * expired invite "Pending", and an enum this build doesn't know must still read
 * as words rather than as `ACCEPTED`.
 */
const INVITE_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: "Pending", tone: "attention" },
  ACCEPTED: { label: "Accepted", tone: "positive" },
  REVOKED: { label: "Revoked", tone: "muted" },
  EXPIRED: { label: "Expired", tone: "muted" },
};

function inviteStatusMeta(value: string): StatusMeta {
  return (
    INVITE_STATUS[value] ?? {
      label: humanizeLabel(value.toLowerCase()),
      tone: "neutral",
    }
  );
}

function InviteRow({
  invite,
  canManage,
  onRevoke,
  busy,
}: {
  invite: V2ProjectMemberInviteDTO;
  canManage: boolean;
  onRevoke: () => void;
  busy: boolean;
}) {
  const expiry = inviteExpiry(invite.expiresAt);
  const status = inviteStatusMeta(invite.status);

  return (
    <ItemRow
      role="listitem"
      padding="dense"
      className="border-b-0"
      aria-label={`Invite for ${invite.email}`}
      leading={
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden
        >
          <EnvelopeSimpleIcon className="size-4" />
        </span>
      }
      title={
        <span className="truncate text-sm font-medium text-foreground">
          {invite.email}
        </span>
      }
      subtitle={
        <p className="truncate text-xs text-muted-foreground">
          {roleLabel(invite.role)} · invited{" "}
          <span title={fmtDateTime(invite.createdAt)}>
            {timeAgo(invite.createdAt)}
          </span>
          {expiry ? ` · ${expiry}` : ""}
        </p>
      }
      trailing={
        <div className="flex items-center gap-2">
          <StatusBadge {...status} />
          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              disabled={busy}
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="size-3.5" aria-hidden />
              Revoke invite
            </Button>
          )}
        </div>
      }
    />
  );
}

function InviteMemberForm({ slug }: { slug: string }) {
  const inviteMut = useCreateProjectMemberInvite(slug);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<V2ProjectMemberRole>("EDITOR");
  const [touched, setTouched] = React.useState(false);

  // Validated against the API's own invite schema, so Send is never offered
  // for an address the endpoint will reject.
  const emailError = validateInviteEmail(email);
  const canSend = !emailError && !inviteMut.isPending;

  async function handleInvite() {
    if (!canSend) {
      setTouched(true);
      return;
    }
    const trimmed = email.trim();
    try {
      await inviteMut.mutateAsync({ email: trimmed, role });
      toast.success(`Invite sent to ${trimmed}`);
      setEmail("");
      setTouched(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't send the invite",
      );
    }
  }

  const showError = touched && email.length > 0 && emailError;

  return (
    <div className="space-y-2">
      <Label htmlFor="m-invite-email">Invite by email</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            id="m-invite-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleInvite();
              }
            }}
            placeholder="teammate@company.com"
            type="email"
            disabled={inviteMut.isPending}
            aria-invalid={showError ? true : undefined}
            aria-describedby={showError ? "m-invite-email-error" : undefined}
          />
          {showError && (
            <FieldError id="m-invite-email-error" className="text-xs">
              {emailError}
            </FieldError>
          )}
        </div>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as V2ProjectMemberRole)}
          disabled={inviteMut.isPending}
        >
          <SelectTrigger className="w-32" aria-label="Invite role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITE_ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          onClick={handleInvite}
          disabled={!canSend}
          className="tactile gap-1.5 sm:shrink-0"
        >
          <PlusIcon className="size-3.5" aria-hidden />
          {inviteMut.isPending ? "Sending…" : "Send invite"}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        The invitee sees this project the first time they sign in to Semblia
        with the same email. Owners can&apos;t be invited — promote an existing
        member instead.
      </p>
    </div>
  );
}

export function MembersClient({ project }: { project: V2ProjectDTO }) {
  const slug = project.slug;
  const membersQuery = useProjectMembers(slug);
  const invitesQuery = useProjectMemberInvites(slug);
  const updateMut = useUpdateProjectMember(slug);
  const removeMut = useRemoveProjectMember(slug);
  const revokeInviteMut = useRevokeProjectMemberInvite(slug);

  const canManage = canManageMembers(project);

  const members = React.useMemo(
    () => membersQuery.data ?? [],
    [membersQuery.data],
  );
  const invites = React.useMemo(
    () => invitesQuery.data ?? [],
    [invitesQuery.data],
  );

  const membersState = useDataState(membersQuery, { count: members.length });
  const invitesState = useDataState(invitesQuery, { count: invites.length });

  const ownerCount = members.filter((m) => m.role === "OWNER").length;
  const memberBusy = updateMut.isPending || removeMut.isPending;

  async function handleRoleChange(
    member: V2ProjectMemberDTO,
    role: V2ProjectMemberRole,
  ) {
    if (member.role === role) return;
    try {
      await updateMut.mutateAsync({ userId: member.userId, role });
      toast.success(`${memberName(member)} is now ${roleLabel(role)}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't update the role",
      );
    }
  }

  async function handleRemove(member: V2ProjectMemberDTO) {
    try {
      await removeMut.mutateAsync(member.userId);
      toast.success(`${memberName(member)} removed from this project`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't remove the member",
      );
    }
  }

  async function handleRevokeInvite(invite: V2ProjectMemberInviteDTO) {
    try {
      await revokeInviteMut.mutateAsync(invite.id);
      toast.success(`Invite for ${invite.email} revoked`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't revoke the invite",
      );
    }
  }

  return (
    <PageBody padding="default">
      <div className="space-y-8 pb-8">
        <SettingsSection
          id="members"
          title="Project members"
          description={
            canManage
              ? "Invite teammates and tune their access. Project membership is independent from the Clerk organization."
              : "Who has access to this project. Ask an owner or admin to invite or remove members."
          }
          flush
          actions={
            membersState.kind === "ready" ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            ) : undefined
          }
        >
          <DataState
            state={membersState}
            resource="this project's members"
            align="start"
            className="px-4 py-2"
            skeleton={
              <ListSkeleton
                rows={3}
                leading="circle"
                trailing
                density="dense"
                className="-mx-4 -my-2"
              />
            }
            empty={
              <EmptyState
                icon={UsersThreeIcon}
                align="start"
                title="No members listed"
                description="Every project keeps at least its owner, so an empty list means the membership record is out of step. Reload, and contact support if it stays empty."
              />
            }
          >
            {/* Rows bleed to the card edge so the hairlines run its full width;
                the empty and error surfaces keep the card's inset. */}
            <DataList aria-label="Project members" className="-mx-4 -my-2">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  canManage={canManage}
                  isLastOwner={member.role === "OWNER" && ownerCount <= 1}
                  onRoleChange={(role) => handleRoleChange(member, role)}
                  onRemove={() => handleRemove(member)}
                  busy={memberBusy}
                />
              ))}
            </DataList>
          </DataState>
        </SettingsSection>

        <SettingsSection
          id="invites"
          title="Pending invites"
          description={
            canManage
              ? "Invites are valid for 14 days and become active members the first time the invitee signs in."
              : "Invites an admin has sent that nobody has accepted yet."
          }
          flush
        >
          <DataState
            state={invitesState}
            resource="pending invites"
            align="start"
            className="px-4 py-2"
            skeleton={
              <ListSkeleton
                rows={2}
                leading="circle"
                trailing
                density="dense"
                className="-mx-4 -my-2"
              />
            }
            empty={
              // Nothing outstanding is reassurance, not a setup failure — so it
              // carries no call to action.
              <p className="py-3 text-xs text-muted-foreground">
                No invites are waiting. Anyone you invite appears here until
                they sign in.
              </p>
            }
          >
            <DataList aria-label="Pending invites" className="-mx-4 -my-2">
              {invites.map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  canManage={canManage}
                  onRevoke={() => handleRevokeInvite(invite)}
                  busy={revokeInviteMut.isPending}
                />
              ))}
            </DataList>
          </DataState>
        </SettingsSection>

        {/* The invite form is only rendered for a role that may actually use
            it — MANAGE_MEMBERS gates the endpoint, and a permanently inert
            form would be chrome pretending to be a control. */}
        {canManage && (
          <SettingsSection
            id="invite"
            title="Add a member"
            description="Invite by email. The invitee accepts on their next sign-in."
          >
            <InviteMemberForm slug={slug} />
          </SettingsSection>
        )}
      </div>
    </PageBody>
  );
}
