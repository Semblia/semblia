"use client";

import * as React from "react";
import { notFound, useRouter } from "next/navigation";
import { TestimonialDetail } from "@/components/testimonials/testimonial-detail";
import { useTestimonial } from "@/hooks/api";
import { useTestimonialModeration } from "@/hooks/use-testimonial-moderation";

interface Props {
  slug: string;
  testimonialId: string;
}

export function TestimonialDetailPage({ slug, testimonialId }: Props) {
  const router = useRouter();
  const detailQuery = useTestimonial(slug, testimonialId);

  const testimonial = React.useMemo(
    () => detailQuery.data ?? null,
    [detailQuery.data],
  );

  const {
    handleApprove,
    handleReject,
    handleTogglePublish,
    isApproving,
    isRejecting,
    isPublishing,
  } = useTestimonialModeration(slug);

  if (detailQuery.isError) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <TestimonialDetail
        testimonial={testimonial}
        loading={detailQuery.isPending}
        variant="page"
        showBack
        onBack={() => router.push(`/projects/${slug}/testimonials`)}
        onApprove={handleApprove}
        onReject={handleReject}
        onTogglePublish={handleTogglePublish}
        isApproving={isApproving}
        isRejecting={isRejecting}
        isPublishing={isPublishing}
      />
    </div>
  );
}
