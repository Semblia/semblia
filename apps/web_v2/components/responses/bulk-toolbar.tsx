"use client";

import {
  CheckCircle as CheckCircle2Icon,
  XCircle as XCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// ── Bulk actions toolbar ────────────────────────────────────────────────────

export function BulkToolbar({
  count,
  onApproveAll,
  onRejectAll,
  onCancel,
}: {
  count: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-brand/20 bg-brand/[0.04] px-6 py-2 animate-fade-up">
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {count} selected
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          size="xs"
          variant="outline"
          className="gap-1 hover:bg-success/8 hover:text-success hover:border-success/30 active:scale-[0.97]"
          onClick={onApproveAll}
        >
          <CheckCircle2Icon className="size-3" />
          Approve {count}
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="gap-1 hover:bg-destructive/6 hover:text-destructive hover:border-destructive/30 active:scale-[0.97]"
          onClick={onRejectAll}
        >
          <XCircleIcon className="size-3" />
          Reject {count}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
