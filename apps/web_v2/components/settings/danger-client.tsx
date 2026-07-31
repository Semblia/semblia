"use client";

/**
 * DangerClient — ownership transfer and project deletion.
 *
 * Both actions are guarded by MANAGE_PROJECT, and transfer additionally
 * requires being the primary owner. What changed here:
 *   • the members query had no failure state, so a 500 made
 *     `eligibleMembers.length === 0` true and the row confidently said
 *     "Ownership can only move to an existing member — add a member first."
 *     That is a lie told by an empty array. The row now distinguishes loading,
 *     failed, forbidden, and genuinely-nobody-eligible.
 *   • Delete was offered to every role; a view-only member got a modal, typed
 *     the slug, and received a 403. It is inert with the reason in place now.
 *   • right-column actions read `Verb + Noun` — "Transfer ownership",
 *     "Delete project" — not bare "Transfer" / "Delete".
 *   • the transfer dialog held a bordered note inside the dialog surface, which
 *     is the cards-on-cards defect in a floating layer.
 *
 * Both confirmations stay modal with an explicit typed gate: the transfer
 * dialog requires the exact project name (mirroring
 * `initiateOwnershipTransferBodySchema.confirmName`), and delete requires the
 * exact slug. Neither Confirm button enables until the typed value matches.
 */

import * as React from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowsLeftRight as TransferIcon,
  Clock as ClockIcon,
} from "@phosphor-icons/react";
import type {
  V2InitiateProjectOwnershipTransferBody,
  V2ProjectDTO,
  V2ProjectMemberDTO,
  V2ProjectOwnershipTransferDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataState,
  PageBody,
  SettingsSection,
  useDataState,
  type DataStateKind,
} from "@/components/shared";
import {
  useCancelProjectOwnershipTransfer,
  useDeleteProject,
  useInitiateProjectOwnershipTransfer,
  useProjectMembers,
  useProjectOwnershipTransfer,
} from "@/hooks/api";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { homePath, settingsMembersPath } from "@/lib/routes";
import {
  canManageProject,
  projectRoleLabel as roleLabel,
} from "./shared/normalize";
import { DeleteProjectDialog } from "./shared/delete-project-dialog";

const DELETE_FORBIDDEN_REASON =
  "Only a project owner or admin can delete this project.";

function userLabel(user: V2ProjectMemberDTO["user"]) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  );
}

/** Guarded countdown: an unparseable timestamp must never render as "NaNd". */
function expiryLabel(value: string): string {
  const expires = new Date(value).getTime();
  if (!Number.isFinite(expires)) return "expiry unknown";

  const diffMs = expires - Date.now();
  if (diffMs <= 0) return "expired";

  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `expires in ${hours}h`;
  return `expires in ${Math.ceil(hours / 24)}d`;
}

function TransferOwnershipDialog({
  open,
  onOpenChange,
  project,
  members,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: V2ProjectDTO;
  members: V2ProjectMemberDTO[];
  pending: boolean;
  onSubmit: (body: V2InitiateProjectOwnershipTransferBody) => Promise<void>;
}) {
  const [toUserId, setToUserId] = React.useState("");
  const [confirmName, setConfirmName] = React.useState("");
  const selectedMember = members.find((member) => member.userId === toUserId);
  // The gate the API enforces, enforced here first: exact project name.
  const canSubmit = Boolean(toUserId) && confirmName === project.name;

  React.useEffect(() => {
    if (!open) {
      setToUserId("");
      setConfirmName("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            The recipient becomes the primary owner. You stay on this project as
            an admin, and billing does not move.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ownership-recipient">New owner</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger id="ownership-recipient" className="w-full">
                <SelectValue placeholder="Choose a project member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    <span className="flex min-w-0 flex-col text-left">
                      <span className="truncate text-sm">
                        {userLabel(member.user)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {/* Never the raw enum: `BILLING_ADMIN` lowercased is
                            still `billing_admin` in front of a user. */}
                        {member.user.email} · {roleLabel(member.role)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* A note, not a second bordered surface inside the dialog. */}
            {selectedMember && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {userLabel(selectedMember.user)} will have 72 hours to accept.
                Until then, you remain the primary owner.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ownership-confirm">Type the project name</Label>
            <Input
              id="ownership-confirm"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={project.name}
              autoComplete="off"
              aria-describedby="ownership-confirm-help"
            />
            <p
              id="ownership-confirm-help"
              className="text-xs text-muted-foreground"
            >
              Transfer stays unavailable until this matches exactly.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || pending}
            onClick={() => {
              if (!canSubmit) return;
              void onSubmit({ toUserId, confirmName });
            }}
          >
            {pending ? "Sending…" : "Request transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A danger-zone row: label, one sentence of consequence, one control. */
function DangerRow({
  icon,
  title,
  tone = "default",
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "default" | "destructive";
  description: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={
            tone === "destructive"
              ? "flex items-center gap-2 text-sm font-medium text-destructive"
              : "flex items-center gap-2 text-sm font-medium text-foreground"
          }
        >
          {icon}
          {title}
        </p>
        <div className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function PendingTransferRow({
  transfer,
  onCancel,
  disabled,
}: {
  transfer: V2ProjectOwnershipTransferDTO;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <DangerRow
      icon={<ClockIcon className="size-4 text-warning" aria-hidden />}
      title="Transfer pending"
      description={
        <>
          Waiting for {transfer.toUser.email} to accept ·{" "}
          {expiryLabel(transfer.expiresAt)} · requested{" "}
          <span title={fmtDateTime(transfer.createdAt)}>
            {timeAgo(transfer.createdAt)}
          </span>
        </>
      }
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={disabled}
        >
          {disabled ? "Cancelling…" : "Cancel transfer"}
        </Button>
      }
    />
  );
}

export function DangerClient({ project }: { project: V2ProjectDTO }) {
  const router = useRouter();
  const deleteProject = useDeleteProject(project.slug);
  const membersQuery = useProjectMembers(project.slug, { freshOnMount: true });
  const transferQuery = useProjectOwnershipTransfer(project.slug, {
    freshOnMount: true,
  });
  const initiateTransfer = useInitiateProjectOwnershipTransfer(project.slug);
  const cancelTransfer = useCancelProjectOwnershipTransfer(project.slug);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  const canManage = canManageProject(project);
  const canTransferOwnership = project.access.isPrimaryOwner && canManage;

  const eligibleMembers = React.useMemo(
    () =>
      (membersQuery.data ?? []).filter(
        (member) => member.userId !== project.userId,
      ),
    [membersQuery.data, project.userId],
  );

  // Non-collection semantics: what matters is whether the member list arrived
  // at all, because "nobody is eligible" and "we couldn't ask" lead the user to
  // opposite next steps.
  const membersState = useDataState(membersQuery);
  const transferState = useDataState(transferQuery);
  const membersReady = membersState.kind === "ready";
  const noEligibleMembers = membersReady && eligibleMembers.length === 0;

  async function handleDelete() {
    setDeleteOpen(false);
    try {
      await deleteProject.mutateAsync();
      toast.success("Project deleted");
      router.push(homePath());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete the project",
      );
    }
  }

  async function handleTransfer(body: V2InitiateProjectOwnershipTransferBody) {
    try {
      await initiateTransfer.mutateAsync(body);
      toast.success("Ownership transfer requested");
      setTransferOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't request the transfer",
      );
    }
  }

  async function handleCancelTransfer() {
    try {
      await cancelTransfer.mutateAsync();
      toast.success("Ownership transfer cancelled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't cancel the transfer",
      );
    }
  }

  return (
    <PageBody padding="bare">
      <div className="pb-8">
        <SettingsSection
          id="danger"
          title="Danger zone"
          description="These actions are irreversible. Each one asks you to type an exact value before it will run."
          tone="danger"
          flush
        >
          <div className="divide-y divide-destructive/15">
            {/* The transfer row is derived, not hand-laddered. Reading
                `transferQuery.data ? pending : none` directly would render
                "Transfer ownership" after a failed GET — and offering to open a
                transfer while one is already pending is exactly the action the
                API refuses. `DataState` makes that unrepresentable. */}
            {canTransferOwnership && (
              <DataState
                state={transferState}
                resource="this project's pending ownership transfer"
                align="start"
                compactError
                skeleton={<TransferRowSkeleton />}
              >
                {transferQuery.data ? (
                  <PendingTransferRow
                    transfer={transferQuery.data}
                    onCancel={handleCancelTransfer}
                    disabled={cancelTransfer.isPending}
                  />
                ) : (
                  <DangerRow
                    icon={
                      <TransferIcon
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    }
                    title="Transfer ownership"
                    description={
                      <TransferDescription
                        membersKind={membersState.kind}
                        noEligibleMembers={noEligibleMembers}
                        slug={project.slug}
                      />
                    }
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!membersReady || noEligibleMembers}
                        onClick={() => setTransferOpen(true)}
                      >
                        Transfer ownership
                      </Button>
                    }
                  />
                )}
              </DataState>
            )}

            <DangerRow
              icon={null}
              title="Delete project"
              tone="destructive"
              description={
                canManage
                  ? "Permanently removes the project, its forms, widgets, and every testimonial. Public addresses stop resolving immediately."
                  : DELETE_FORBIDDEN_REASON
              }
              action={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  disabled={!canManage}
                  className="tactile"
                >
                  Delete project
                </Button>
              }
            />
          </div>
        </SettingsSection>
      </div>

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        slug={project.slug}
        onConfirm={handleDelete}
      />
      <TransferOwnershipDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        project={project}
        members={eligibleMembers}
        pending={initiateTransfer.isPending}
        onSubmit={handleTransfer}
      />
    </PageBody>
  );
}

/**
 * Five distinct facts, five distinct sentences. The previous build collapsed
 * "the list failed" into "there is nobody to transfer to", which sent the owner
 * off to invite a member they already had — and told them to retry a permission
 * denial, which can only fail again.
 */
function TransferDescription({
  membersKind,
  noEligibleMembers,
  slug,
}: {
  membersKind: DataStateKind;
  noEligibleMembers: boolean;
  slug: string;
}) {
  if (membersKind === "loading-initial") {
    return <>Checking who is eligible to receive ownership…</>;
  }
  if (membersKind === "forbidden" || membersKind === "not-found") {
    return (
      <>
        This project&apos;s members can&apos;t be listed with your current
        access, so there is no way to pick a recipient. A project owner or admin
        can grant it.
      </>
    );
  }
  if (membersKind === "error") {
    return (
      <>
        Couldn&apos;t load this project&apos;s members, so eligible recipients
        are unknown. Reload the page and try again.
      </>
    );
  }
  if (noEligibleMembers) {
    return (
      <>
        Ownership can only move to an existing member.{" "}
        <Link
          href={settingsMembersPath(slug)}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Add a member
        </Link>{" "}
        first.
      </>
    );
  }
  return <>Move primary ownership to an existing project member.</>;
}

/** Matches the transfer row's real height so the swap causes no shift. */
function TransferRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 p-5" aria-hidden>
      <div className="flex-1 space-y-2">
        <Skeleton className="animate-shimmer h-3.5 w-40" />
        <Skeleton className="animate-shimmer h-2.5 w-64" />
      </div>
      <Skeleton className="animate-shimmer h-8 w-36 shrink-0 rounded-md" />
    </div>
  );
}
