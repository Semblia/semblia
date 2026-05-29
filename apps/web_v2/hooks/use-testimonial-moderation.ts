import * as React from "react";
import { toast } from "sonner";
import {
  useApproveTestimonial,
  useRejectTestimonial,
  usePublishTestimonial,
} from "@/hooks/api";

/**
 * Encapsulates moderation actions for a testimonial detail view. Mutations
 * invalidate the list and detail queries on success, so the UI reflects the
 * new server state on the next refetch.
 *
 * The `handle*` variants (used by the detail panel/page footer and the a/r/p
 * keyboard shortcuts) toast on success/error so a deliberate single decision is
 * confirmed visibly. The `handleInline*` variants (used by the list rows and
 * bulk toolbar) stay quiet: the row leaving the list is the feedback, and a
 * bulk action would otherwise fire one toast per item.
 *
 * `isApproving` / `isRejecting` / `isPublishing` let the footer disable its
 * controls while a mutation is in flight, preventing double-submits.
 */
export function useTestimonialModeration(slug: string) {
  const approveMutation = useApproveTestimonial(slug);
  const rejectMutation = useRejectTestimonial(slug);
  const publishMutation = usePublishTestimonial(slug);

  const handleApprove = React.useCallback(
    (id: string) => {
      approveMutation.mutate(id, {
        onSuccess: () => toast.success("Testimonial approved"),
        onError: () => toast.error("Couldn't approve — try again"),
      });
    },
    [approveMutation],
  );

  const handleReject = React.useCallback(
    (id: string) => {
      rejectMutation.mutate(id, {
        onSuccess: () => toast.success("Testimonial rejected"),
        onError: () => toast.error("Couldn't reject — try again"),
      });
    },
    [rejectMutation],
  );

  const handleTogglePublish = React.useCallback(
    (id: string, published: boolean) => {
      publishMutation.mutate(
        { testimonialId: id, published },
        {
          onSuccess: () =>
            toast.success(
              published ? "Testimonial published" : "Testimonial unpublished",
            ),
          onError: () =>
            toast.error(
              published
                ? "Couldn't publish — try again"
                : "Couldn't unpublish — try again",
            ),
        },
      );
    },
    [publishMutation],
  );

  const handleInlineApprove = React.useCallback(
    (id: string) => {
      approveMutation.mutate(id);
    },
    [approveMutation],
  );

  const handleInlineReject = React.useCallback(
    (id: string) => {
      rejectMutation.mutate(id);
    },
    [rejectMutation],
  );

  return {
    handleApprove,
    handleReject,
    handleTogglePublish,
    handleInlineApprove,
    handleInlineReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isPublishing: publishMutation.isPending,
  };
}
