import * as React from "react";
import { toast } from "sonner";
import { useModerateResponse } from "@/hooks/api";

/**
 * Encapsulates moderation actions for a response (collected feedback) detail
 * view. The single `moderate` mutation drives every decision by setting the
 * response's `moderationStatus`; this hook exposes intent-named helpers over it.
 * Mutations invalidate the list and detail queries on success, so the UI
 * reflects the new server state on the next refetch.
 *
 * The `handle*` variants (used by the detail panel/page footer and the a/r
 * keyboard shortcuts) toast on success/error so a deliberate single decision is
 * confirmed visibly. The `handleInline*` variants (used by the list rows and
 * bulk toolbar) stay quiet: the row leaving the list is the feedback, and a
 * bulk action would otherwise fire one toast per item.
 *
 * `isApproving` / `isRejecting` let the footer disable its controls while a
 * mutation is in flight, preventing double-submits.
 */
export function useResponseModeration(slug: string) {
  const moderate = useModerateResponse(slug);
  const [pendingStatus, setPendingStatus] = React.useState<
    "APPROVED" | "REJECTED" | null
  >(null);

  const handleApprove = React.useCallback(
    (id: string) => {
      setPendingStatus("APPROVED");
      moderate.mutate(
        { responseId: id, moderationStatus: "APPROVED" },
        {
          onSuccess: () => toast.success("Response approved"),
          onError: () => toast.error("Couldn't approve — try again"),
          onSettled: () => setPendingStatus(null),
        },
      );
    },
    [moderate],
  );

  const handleReject = React.useCallback(
    (id: string) => {
      setPendingStatus("REJECTED");
      moderate.mutate(
        { responseId: id, moderationStatus: "REJECTED" },
        {
          onSuccess: () => toast.success("Response rejected"),
          onError: () => toast.error("Couldn't reject — try again"),
          onSettled: () => setPendingStatus(null),
        },
      );
    },
    [moderate],
  );

  const handleInlineApprove = React.useCallback(
    (id: string) => {
      moderate.mutate({ responseId: id, moderationStatus: "APPROVED" });
    },
    [moderate],
  );

  const handleInlineReject = React.useCallback(
    (id: string) => {
      moderate.mutate({ responseId: id, moderationStatus: "REJECTED" });
    },
    [moderate],
  );

  return {
    handleApprove,
    handleReject,
    handleInlineApprove,
    handleInlineReject,
    isApproving: moderate.isPending && pendingStatus === "APPROVED",
    isRejecting: moderate.isPending && pendingStatus === "REJECTED",
  };
}
