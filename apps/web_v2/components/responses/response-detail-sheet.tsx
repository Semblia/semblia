"use client";

/**
 * ResponseDetailSheet — read the whole submission before deciding on it.
 *
 * The queue row shows a two-line excerpt, which is enough to triage an obvious
 * approve and nowhere near enough for a borderline one. This is where the full
 * answer set, the consent the author gave, the automated verdict, and the
 * provenance live — everything the decision actually depends on.
 *
 * It stays non-modal on purpose: the queue behind it remains readable, and ↑/↓
 * walk to the adjacent record without a close-reopen round trip.
 */

import * as React from "react";
import { CheckIcon, XIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import {
  DetailSheet,
  DefinitionList,
  Section,
  StatusBadge,
  reviewStatusMeta,
  publishStatusMeta,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { orDash, timeAgo, fmtDateTime, fmtRating } from "@/lib/format";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import type {
  V2ResponseDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import { ModerationVerdict } from "./moderation-verdict";

const CONSENT_LABELS: Array<{
  key: keyof V2ResponseDTO["consent"];
  label: string;
}> = [
  { key: "canPublishText", label: "Their testimonial" },
  { key: "canPublishName", label: "Their name" },
  { key: "canPublishRole", label: "Their role" },
  { key: "canPublishCompany", label: "Their company" },
  { key: "canPublishAvatar", label: "Their photo" },
  { key: "canEditForClarity", label: "Edits for clarity" },
];

export interface ResponseDetailSheetProps {
  response: V2ResponseDTO | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  busy?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onTogglePublish: (id: string, next: V2FormResponsePublishStatus) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function ResponseDetailSheet({
  response,
  onClose,
  onPrev,
  onNext,
  busy = false,
  onApprove,
  onReject,
  onTogglePublish,
  returnFocusRef,
}: ResponseDetailSheetProps) {
  if (!response) return null;

  const author = response.authorName?.trim() || "Anonymous";
  const isPublished = response.publishStatus === "PUBLISHED";
  const rating = fmtRating(response.ratingValue, response.ratingScale);

  return (
    <DetailSheet
      open
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      returnFocusRef={returnFocusRef}
      title={author}
      meta={
        <>
          <StatusBadge {...reviewStatusMeta(response.reviewStatus)} />
          <span title={fmtDateTime(response.createdAt)}>
            {timeAgo(response.createdAt)}
          </span>
        </>
      }
      footer={
        <ResponseActions
          response={response}
          busy={busy}
          isPublished={isPublished}
          onApprove={() => onApprove(response.id)}
          onReject={() => onReject(response.id)}
          onTogglePublish={() =>
            onTogglePublish(
              response.id,
              isPublished ? "UNPUBLISHED" : "PUBLISHED",
            )
          }
        />
      }
    >
      <div className="space-y-6">
        <Section title="Submission" density="tight" as="h3">
          {response.answers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              This submission carried no displayable answers — it may be a
              recording, or every field was marked private.
            </p>
          ) : (
            <dl className="space-y-3">
              {response.answers.map((answer) => (
                <div key={answer.fieldId}>
                  <dt className="text-[11px] font-medium text-muted-foreground">
                    {answer.labelSnapshot}
                    {!answer.publishable && (
                      <span className="ml-1.5 font-normal text-muted-foreground/70">
                        (not for publication)
                      </span>
                    )}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                    {renderAnswer(answer.value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title="Author" density="tight" as="h3" divided>
          <DefinitionList
            items={[
              { term: "Name", value: orDash(response.authorName) },
              { term: "Role", value: orDash(response.authorRole) },
              { term: "Company", value: orDash(response.authorCompany) },
              { term: "Rating", value: rating ?? "—" },
            ]}
          />
        </Section>

        <Section
          title="Consent"
          description="What the author agreed you may publish. Anything withheld blocks featuring until they grant it."
          density="tight"
          as="h3"
          divided
        >
          <ul className="space-y-1.5">
            {CONSENT_LABELS.map(({ key, label }) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <span className="text-muted-foreground">{label}</span>
                <span
                  className={
                    response.consent[key]
                      ? "font-medium text-success"
                      : "font-medium text-muted-foreground"
                  }
                >
                  {response.consent[key] ? "Granted" : "Withheld"}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Automated check" density="tight" as="h3" divided>
          <ModerationVerdict
            runs={response.moderationRuns}
            humanDecision={
              response.reviewStatus === "PENDING"
                ? null
                : {
                    label: reviewStatusMeta(response.reviewStatus).label,
                    at: response.moderatedAt,
                  }
            }
          />
          {response.moderationReason && (
            <p className="text-xs text-muted-foreground">
              Reason recorded: {response.moderationReason}
            </p>
          )}
        </Section>

        <Section title="Provenance" density="tight" as="h3" divided>
          <DefinitionList
            items={[
              {
                term: "Arrived",
                value: fmtDateTime(response.createdAt),
              },
              {
                term: "Source",
                value:
                  response.origin === "IMPORT"
                    ? formatImportSourceLabel(
                        typeof response.sourceMetadata.source === "string"
                          ? response.sourceMetadata.source
                          : null,
                      )
                    : (response.form?.name ?? "Form"),
              },
              { term: "Trust", value: response.trustMode },
              {
                term: "Display state",
                value: publishStatusMeta(response.publishStatus).label,
              },
            ]}
          />
        </Section>
      </div>
    </DetailSheet>
  );
}

function ResponseActions({
  response,
  busy,
  isPublished,
  onApprove,
  onReject,
  onTogglePublish,
}: {
  response: V2ResponseDTO;
  busy: boolean;
  isPublished: boolean;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: () => void;
}) {
  if (response.reviewStatus === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          disabled={busy}
          onClick={onApprove}
        >
          <CheckIcon className="size-3.5" weight="bold" aria-hidden />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-xs"
          disabled={busy}
          onClick={onReject}
        >
          <XIcon className="size-3.5" weight="bold" aria-hidden />
          Reject
        </Button>
      </div>
    );
  }

  if (response.reviewStatus !== "APPROVED") {
    return (
      <p className="text-xs text-muted-foreground">
        This response is{" "}
        {reviewStatusMeta(response.reviewStatus).label.toLowerCase()}. Move it
        back to pending from the queue to review it again.
      </p>
    );
  }

  const blocked = !isPublished && !response.publishable;

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant={isPublished ? "outline" : "default"}
        className="w-full gap-1.5 text-xs"
        disabled={busy || blocked}
        onClick={onTogglePublish}
      >
        {isPublished ? (
          <EyeSlashIcon className="size-3.5" weight="bold" aria-hidden />
        ) : (
          <EyeIcon className="size-3.5" weight="bold" aria-hidden />
        )}
        {isPublished ? "Remove from widgets" : "Feature in widgets"}
      </Button>
      {blocked && (
        <p className="text-xs text-muted-foreground">
          {response.publishBlockedReason ??
            "The author didn't consent to publishing this."}{" "}
          Ask them to resubmit with consent, or keep it as private proof.
        </p>
      )}
    </div>
  );
}

function renderAnswer(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const parts = value.filter(
      (v) => typeof v === "string" || typeof v === "number",
    );
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  return "—";
}
