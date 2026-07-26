"use client";

import * as React from "react";
import {
  ArrowsClockwiseIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { V2ImportConnectionDTO } from "@workspace/types";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  useDeleteImportConnection,
  useDisableImportConnection,
  useEnableImportConnection,
  useSyncImportConnection,
  useUpdateImportConnection,
} from "@/hooks/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ConnectionRow({
  projectId,
  sourceLabel,
  connection,
}: {
  projectId: string;
  sourceLabel: string;
  connection: V2ImportConnectionDTO;
}) {
  const update = useUpdateImportConnection({
    slug: projectId,
    connectionId: connection.id,
  });
  const sync = useSyncImportConnection({ slug: projectId });
  const enable = useEnableImportConnection({ slug: projectId });
  const disable = useDisableImportConnection({ slug: projectId });
  const remove = useDeleteImportConnection({ slug: projectId });
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const autoSyncId = React.useId();
  const publicUrl = connection.publicUrl;
  const isBusy =
    update.isPending ||
    sync.isPending ||
    enable.isPending ||
    disable.isPending ||
    remove.isPending;
  const actionFailed =
    update.isError ||
    sync.isError ||
    enable.isError ||
    disable.isError ||
    remove.isError;

  async function updateAutoSync(checked: boolean) {
    try {
      await update.mutateAsync({ autoSyncEnabled: checked });
      toast.success(
        checked ? "Automatic sync enabled" : "Automatic sync paused",
      );
    } catch {
      // The row-level error remains visible.
    }
  }

  async function syncNow() {
    try {
      await sync.mutateAsync(connection.id);
      toast.success("Sync queued", {
        description: `${connection.resourceLabel ?? sourceLabel} will import in the background.`,
      });
    } catch {
      // The row-level error remains visible.
    }
  }

  async function toggleEnabled() {
    try {
      if (connection.enabled) {
        await disable.mutateAsync(connection.id);
        toast.success("Connection paused");
      } else {
        await enable.mutateAsync(connection.id);
        toast.success("Connection enabled");
      }
    } catch {
      // The row-level error remains visible.
    }
  }

  async function deleteConnection() {
    try {
      await remove.mutateAsync(connection.id);
      setDeleteOpen(false);
      toast.success("Connection removed");
    } catch {
      // The row-level error remains visible.
    }
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open && remove.isPending) return;
    setDeleteOpen(open);
  }

  return (
    <article className="py-3" aria-busy={isBusy}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-medium">
              {connection.resourceLabel ?? sourceLabel}
            </h4>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                connection.enabled
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {connection.enabled ? "Active" : "Paused"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {connection.lastSyncedAt
              ? `Last synced ${timeAgo(connection.lastSyncedAt)}`
              : "Not synced yet"}
          </p>
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {publicUrl}
            </a>
          ) : null}
          {connection.lastErrorMessage ? (
            <p
              role="alert"
              className="mt-1 flex items-start gap-1.5 text-xs text-destructive"
            >
              <WarningCircleIcon
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden
              />
              <span>{connection.lastErrorMessage}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void syncNow()}
            disabled={!connection.enabled || isBusy || deleteOpen}
          >
            {sync.isPending ? <Spinner /> : <ArrowsClockwiseIcon aria-hidden />}
            Sync now
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void toggleEnabled()}
            disabled={isBusy || deleteOpen}
          >
            {connection.enabled ? (
              <PauseIcon aria-hidden />
            ) : (
              <PlayIcon aria-hidden />
            )}
            {connection.enabled ? "Pause" : "Enable"}
          </Button>
          <AlertDialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={isBusy}
              >
                <TrashIcon aria-hidden />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive ring-1 ring-destructive/12">
                  <WarningCircleIcon className="size-5" aria-hidden />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  Remove {connection.resourceLabel ?? sourceLabel}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Syncing stops, but imported proof stays in this project.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    void deleteConnection();
                  }}
                >
                  {remove.isPending ? (
                    <>
                      <Spinner /> Removing
                    </>
                  ) : (
                    "Remove connection"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="mt-3 flex min-h-9 items-center justify-between gap-3 border-t border-border/70 pt-2.5 text-xs">
        <label htmlFor={autoSyncId}>
          Automatic sync
          {!connection.enabled ? (
            <span className="ml-1 text-muted-foreground">
              (connection paused)
            </span>
          ) : null}
        </label>
        <Switch
          id={autoSyncId}
          size="sm"
          checked={connection.autoSyncEnabled}
          onCheckedChange={(checked) => void updateAutoSync(checked)}
          disabled={!connection.enabled || isBusy || deleteOpen}
          aria-label={`Automatic sync for ${connection.resourceLabel ?? sourceLabel}`}
        />
      </div>
      {actionFailed ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          The connection could not be updated. Try again.
        </p>
      ) : null}
    </article>
  );
}
