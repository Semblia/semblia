"use client";

import * as React from "react";
import { notFound, useRouter } from "next/navigation";
import { ResponseDetail } from "@/components/responses/response-detail";
import { useResponse } from "@/hooks/api";
import { useResponseModeration } from "@/hooks/use-response-moderation";

interface Props {
  slug: string;
  responseId: string;
}

export function ResponseDetailPage({ slug, responseId }: Props) {
  const router = useRouter();
  const detailQuery = useResponse(slug, responseId);

  const response = React.useMemo(
    () => detailQuery.data ?? null,
    [detailQuery.data],
  );

  const { handleApprove, handleReject, isApproving, isRejecting } =
    useResponseModeration(slug);

  if (detailQuery.isError) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <ResponseDetail
        response={response}
        loading={detailQuery.isPending}
        variant="page"
        showBack
        onBack={() => router.push(`/projects/${slug}/responses`)}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
        isRejecting={isRejecting}
      />
    </div>
  );
}
