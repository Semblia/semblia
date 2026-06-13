"use client";

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
import { PageBody, SettingsSection } from "@/components/shared";
import {
  useCancelProjectOwnershipTransfer,
  useDeleteProject,
  useInitiateProjectOwnershipTransfer,
  useProjectMembers,
  useProjectOwnershipTransfer,
} from "@/hooks/api";
import { DeleteProjectDialog } from "./shared/delete-project-dialog";

function userLabel(user: V2ProjectMemberDTO["user"]) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  );
}

function expiryLabel(value: string) {
  const expires = new Date(value).getTime();
  if (!Number.isFinite(expires)) return "expires soon";

  const diffMs = expires - Date.now();
  if (diffMs <= 0) return "expired";

  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `expires in ${hours}h`;

  const days = Math.ceil(hours / 24);
  return `expires in ${days}d`;
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
                      <span className="truncate text-[11px] text-muted-foreground">
                        {member.user.email} · {member.role.toLowerCase()}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMember && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {userLabel(selectedMember.user)} will have 72 hours to accept.
              Until then, you remain the primary owner.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ownership-confirm">Type the project name</Label>
            <Input
              id="ownership-confirm"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={project.name}
              autoComplete="off"
            />
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
    <div className="flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ClockIcon className="size-4 text-warning" aria-hidden />
          Transfer pending
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Waiting for {transfer.toUser.email} to accept ·{" "}
          {expiryLabel(transfer.expiresAt)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={disabled}
        className="shrink-0"
      >
        {disabled ? "Cancelling…" : "Cancel transfer"}
      </Button>
    </div>
  );
}

export function DangerClient({ project }: { project: V2ProjectDTO }) {
  const router = useRouter();
  const deleteProject = useDeleteProject(project.slug);
  const members = useProjectMembers(project.slug, { freshOnMount: true });
  const ownershipTransfer = useProjectOwnershipTransfer(project.slug, {
    freshOnMount: true,
  });
  const initiateTransfer = useInitiateProjectOwnershipTransfer(project.slug);
  const cancelTransfer = useCancelProjectOwnershipTransfer(project.slug);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  const canTransferOwnership = project.access.isPrimaryOwner;
  const eligibleMembers = React.useMemo(
    () =>
      (members.data ?? []).filter((member) => member.userId !== project.userId),
    [members.data, project.userId],
  );
  const noEligibleMembers = !members.isLoading && eligibleMembers.length === 0;

  async function handleDelete() {
    setDeleteOpen(false);
    try {
      await deleteProject.mutateAsync();
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  async function handleTransfer(body: V2InitiateProjectOwnershipTransferBody) {
    try {
      await initiateTransfer.mutateAsync(body);
      toast.success("Ownership transfer requested");
      setTransferOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to request transfer";
      toast.error(message);
    }
  }

  async function handleCancelTransfer() {
    try {
      await cancelTransfer.mutateAsync();
      toast.success("Ownership transfer cancelled");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel transfer";
      toast.error(message);
    }
  }

  return (
    <PageBody contained padding="default">
      <div className="space-y-8 pb-8">
        <SettingsSection
          id="danger"
          title="Danger zone"
          description="Irreversible actions. Double-check before clicking."
        >
          <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/[0.03] dark:bg-destructive/[0.06]">
            <div className="divide-y divide-destructive/15">
              {canTransferOwnership &&
                (ownershipTransfer.data ? (
                  <PendingTransferRow
                    transfer={ownershipTransfer.data}
                    onCancel={handleCancelTransfer}
                    disabled={cancelTransfer.isPending}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <TransferIcon
                          className="size-4 text-muted-foreground"
                          aria-hidden
                        />
                        Transfer ownership
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {noEligibleMembers ? (
                          <>
                            Ownership can only move to an existing member.{" "}
                            <Link
                              href={`/projects/${project.slug}/settings/members`}
                              className="font-medium text-foreground underline-offset-2 hover:underline"
                            >
                              Add a member
                            </Link>{" "}
                            first.
                          </>
                        ) : (
                          "Move primary ownership to an existing project member."
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        members.isLoading ||
                        ownershipTransfer.isLoading ||
                        noEligibleMembers
                      }
                      onClick={() => setTransferOpen(true)}
                      className="shrink-0"
                    >
                      Transfer
                    </Button>
                  </div>
                ))}

              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Delete project
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently deletes the project, forms, widgets, and
                    testimonials.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="tactile shrink-0"
                >
                  Delete
                </Button>
              </div>
            </div>
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
