"use client";

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
  ClockClockwiseIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageBody, SettingsSection } from "@/components/shared";
import {
  useProjectMembers,
  useUpdateProjectMember,
  useRemoveProjectMember,
  useProjectMemberInvites,
  useCreateProjectMemberInvite,
  useRevokeProjectMemberInvite,
} from "@/hooks/api";
import { timeAgo } from "@/lib/format";

const ROLE_OPTIONS: { value: V2ProjectMemberRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "EDITOR", label: "Editor" },
  { value: "VIEWER", label: "Viewer" },
];

// Inviting an OWNER is rejected by the backend — keep this list to roles the
// invite endpoint accepts so the UI never offers an impossible choice.
const INVITE_ROLE_OPTIONS: { value: V2ProjectMemberRole; label: string }[] =
  ROLE_OPTIONS.filter((opt) => opt.value !== "OWNER");

const ROLE_LABEL: Record<V2ProjectMemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

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
        className="size-9 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
      {display}
    </span>
  );
}

function MemberRow({
  member,
  canManage,
  onRoleChange,
  onRemove,
  disabled,
}: {
  member: V2ProjectMemberDTO;
  canManage: boolean;
  onRoleChange: (role: V2ProjectMemberRole) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const displayName =
    [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
    member.user.email;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <MemberAvatar member={member} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {displayName}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {member.user.email}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canManage ? (
          <Select
            value={member.role}
            onValueChange={(v) => onRoleChange(v as V2ProjectMemberRole)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
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
        ) : (
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {ROLE_LABEL[member.role]}
          </span>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label={`Remove ${displayName}`}
          >
            <TrashIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InviteRow({
  invite,
  onRevoke,
  disabled,
}: {
  invite: V2ProjectMemberInviteDTO;
  onRevoke: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/40 text-muted-foreground">
        <EnvelopeSimpleIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {invite.email}
        </p>
        <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
          <ClockClockwiseIcon className="size-3" aria-hidden />
          Invited {timeAgo(invite.createdAt)} · expires{" "}
          {timeAgo(invite.expiresAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {ROLE_LABEL[invite.role]} · pending
        </span>
        <button
          type="button"
          onClick={onRevoke}
          disabled={disabled}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          aria-label={`Revoke invite for ${invite.email}`}
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function InviteMemberForm({
  slug,
  disabled,
}: {
  slug: string;
  disabled?: boolean;
}) {
  const inviteMut = useCreateProjectMemberInvite(slug);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<V2ProjectMemberRole>("EDITOR");

  async function handleInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      await inviteMut.mutateAsync({ email: trimmed, role });
      toast.success(`Invite sent to ${trimmed}`);
      setEmail("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send invite";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <Label htmlFor="m-invite-email">Invite by email</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id="m-invite-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleInvite();
            }
          }}
          placeholder="teammate@company.com"
          type="email"
          disabled={disabled || inviteMut.isPending}
        />
        <Select
          value={role}
          onValueChange={(v) => setRole(v as V2ProjectMemberRole)}
          disabled={disabled || inviteMut.isPending}
        >
          <SelectTrigger className="w-32">
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
          disabled={disabled || inviteMut.isPending || !email.trim()}
          className="gap-1.5 sm:shrink-0"
        >
          <PlusIcon className="size-3.5" />
          {inviteMut.isPending ? "Sending…" : "Send invite"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        The invitee will see this project once they sign in to Semblia with the
        same email. Owners can&apos;t be invited — promote an existing member
        instead.
      </p>
    </div>
  );
}

export function MembersClient({ project }: { project: V2ProjectDTO }) {
  const slug = project.slug;
  const members = useProjectMembers(slug);
  const invites = useProjectMemberInvites(slug);
  const updateMut = useUpdateProjectMember(slug);
  const removeMut = useRemoveProjectMember(slug);
  const revokeInviteMut = useRevokeProjectMemberInvite(slug);

  const canManage = project.access.capabilities.includes("MANAGE_MEMBERS");
  const ownerCount = (members.data ?? []).filter(
    (m) => m.role === "OWNER",
  ).length;
  const pendingInvites = invites.data ?? [];

  async function handleRoleChange(
    member: V2ProjectMemberDTO,
    role: V2ProjectMemberRole,
  ) {
    if (member.role === role) return;
    if (member.role === "OWNER" && role !== "OWNER" && ownerCount <= 1) {
      toast.error("Project must have at least one owner");
      return;
    }
    try {
      await updateMut.mutateAsync({ userId: member.userId, role });
      toast.success("Role updated");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      toast.error(message);
    }
  }

  async function handleRemove(member: V2ProjectMemberDTO) {
    if (member.role === "OWNER" && ownerCount <= 1) {
      toast.error("Can't remove the last owner");
      return;
    }
    try {
      await removeMut.mutateAsync(member.userId);
      toast.success("Member removed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    }
  }

  async function handleRevokeInvite(invite: V2ProjectMemberInviteDTO) {
    try {
      await revokeInviteMut.mutateAsync(invite.id);
      toast.success("Invite revoked");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to revoke invite";
      toast.error(message);
    }
  }

  return (
    <PageBody contained padding="default">
      <div className={cn("space-y-8 pb-8")}>
        <SettingsSection
          id="members"
          title="Project members"
          description={
            canManage
              ? "Invite teammates and tune their access. Project membership is independent from the Clerk organization."
              : "View who has access to this project. Ask an admin to invite or remove members."
          }
        >
          {members.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : members.data && members.data.length > 0 ? (
            <div className="space-y-2">
              {members.data.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  canManage={canManage}
                  onRoleChange={(role) => handleRoleChange(member, role)}
                  onRemove={() => handleRemove(member)}
                  disabled={updateMut.isPending || removeMut.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
              No members yet.
            </p>
          )}
        </SettingsSection>

        {(canManage || pendingInvites.length > 0) && (
          <SettingsSection
            id="invites"
            title="Pending invites"
            description={
              canManage
                ? "Invites are valid for 14 days and become active members the first time the invitee signs in."
                : "Invites your admin has sent but haven't been accepted yet."
            }
          >
            {invites.isLoading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : pendingInvites.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                No pending invites.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <InviteRow
                    key={invite.id}
                    invite={invite}
                    onRevoke={() => handleRevokeInvite(invite)}
                    disabled={!canManage || revokeInviteMut.isPending}
                  />
                ))}
              </div>
            )}
          </SettingsSection>
        )}

        {canManage && (
          <SettingsSection
            id="invite"
            title="Add a member"
            description="Invite by email. The invitee accepts on their next sign-in."
          >
            <InviteMemberForm slug={slug} disabled={!canManage} />
          </SettingsSection>
        )}

        {/* <RoleLegend /> */}
      </div>
    </PageBody>
  );
}
