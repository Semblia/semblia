"use client";

/**
 * RequestRow — one testimonial request in the list, with its per-recipient
 * breakdown always visible underneath. A request rarely carries more than a
 * handful of addresses (the API caps a single ask at 50), so the breakdown
 * sits in the row's own actions slot rather than behind a second click.
 *
 * Submission is the win state (`recipientStateMeta` in `delivery-status.ts`)
 * — it renders bold and, once a `responseId` exists, links straight to the
 * response instead of leaving the owner to go find it.
 */

import * as React from "react";
import Link from "next/link";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { V2FormRequestDTO } from "@workspace/types";
import { ItemRow, StatusDot } from "@/components/shared";
import { timeAgo, fmtDateTime, fmtCount } from "@/lib/format";
import { responsePath } from "@/lib/routes";
import { recipientStateMeta } from "./delivery-status";

export const RequestRow = React.memo(function RequestRow({
  slug,
  request,
}: {
  slug: string;
  request: V2FormRequestDTO;
}) {
  const submittedCount = request.recipients.filter((r) => r.submittedAt).length;

  return (
    <ItemRow
      role="listitem"
      padding="comfortable"
      aria-label={`Request to ${request.formName}`}
      title={
        <span className="truncate text-[13px] font-medium text-foreground">
          {request.formName}
        </span>
      }
      subtitle={
        request.note ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            &ldquo;{request.note}&rdquo;
          </p>
        ) : undefined
      }
      metrics={
        <span className="text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">
            {fmtCount(request.recipients.length)}
          </span>{" "}
          {request.recipients.length === 1 ? "person" : "people"}
          {submittedCount > 0 && (
            <>
              <span className="mx-1.5 text-border" aria-hidden>
                ·
              </span>
              <span className="font-medium text-success">
                {fmtCount(submittedCount)}
              </span>{" "}
              submitted
            </>
          )}
        </span>
      }
      trailing={
        <span
          className="text-xs tabular-nums text-muted-foreground"
          title={fmtDateTime(request.createdAt)}
        >
          {/* "Asked", not "Sent" — createdAt records the ask; the recipient
              breakdown below is what states whether any email actually left. */}
          Asked {timeAgo(request.createdAt)}
        </span>
      }
      actions={
        <RecipientBreakdown slug={slug} recipients={request.recipients} />
      }
    />
  );
});

function RecipientBreakdown({
  slug,
  recipients,
}: {
  slug: string;
  recipients: V2FormRequestDTO["recipients"];
}) {
  return (
    <ul className="w-full divide-y divide-border/60 border-t border-border/60">
      {recipients.map((recipient) => (
        <RecipientLine key={recipient.id} slug={slug} recipient={recipient} />
      ))}
    </ul>
  );
}

function RecipientLine({
  slug,
  recipient,
}: {
  slug: string;
  recipient: V2FormRequestDTO["recipients"][number];
}) {
  const meta = recipientStateMeta(recipient);
  const since = meta.since ? timeAgo(meta.since) : undefined;

  const status = meta.submitted ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
      <CheckCircleIcon className="size-3.5" weight="fill" aria-hidden />
      Submitted
    </span>
  ) : (
    <StatusDot
      label={meta.label}
      tone={meta.tone}
      transitional={meta.transitional}
      since={since}
    />
  );

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-xs">
      <span className="min-w-0 truncate text-foreground">
        {recipient.email}
      </span>
      {meta.submitted && recipient.responseId ? (
        <Link
          href={responsePath(slug, recipient.responseId)}
          aria-label={`View the response ${recipient.email} submitted`}
          className="shrink-0 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {status}
        </Link>
      ) : (
        <span className="shrink-0">{status}</span>
      )}
    </li>
  );
}
