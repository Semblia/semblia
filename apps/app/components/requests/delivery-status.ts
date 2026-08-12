/**
 * Delivery + submission state for one testimonial-request recipient.
 *
 * A recipient's story has two independent facts: whether the *email* reached
 * them, and whether they ever *submitted*. Submission is the one an owner
 * scans the list for, so it always wins over whatever the delivery record
 * says — even a FAILED one, since a response can arrive by a route other than
 * the exact email this record tracks (forwarded, opened on another device).
 *
 * Mirrors the discipline in `components/responses/thank-you-dialog.tsx`
 * (`announceThankYouResult`) and `response-detail.tsx` (`thankYouLine`): name
 * what actually happened, honest wording for a suppressed send, and every
 * switch ends with a fallback because the API can grow a status value before
 * this build knows it.
 */

import type {
  V2EmailDeliveryStateDTO,
  V2FormRequestRecipientDTO,
} from "@workspace/types";
import type { StatusTone } from "@/components/shared";

export interface RecipientStateMeta {
  label: string;
  tone: StatusTone;
  /** True only while the state is genuinely still moving. */
  transitional: boolean;
  /** ISO timestamp this state carries, rendered as "since". `null` otherwise. */
  since: string | null;
  /** The win state — a real submission landed. Drives the row's emphasis + link. */
  submitted: boolean;
}

export function recipientStateMeta(
  recipient: Pick<V2FormRequestRecipientDTO, "submittedAt" | "delivery">,
): RecipientStateMeta {
  if (recipient.submittedAt) {
    return {
      label: "Submitted",
      tone: "positive",
      transitional: false,
      since: recipient.submittedAt,
      submitted: true,
    };
  }

  const { delivery } = recipient;
  if (!delivery) {
    return {
      label: "Recorded",
      tone: "muted",
      transitional: false,
      since: null,
      submitted: false,
    };
  }

  return { ...deliveryMeta(delivery), submitted: false };
}

function deliveryMeta(
  delivery: V2EmailDeliveryStateDTO,
): Omit<RecipientStateMeta, "submitted"> {
  switch (delivery.status) {
    case "SENT":
      return {
        label: "Sent",
        tone: "muted",
        transitional: false,
        since: delivery.sentAt,
      };
    case "PENDING":
    case "ENQUEUED":
      return {
        label: "Queued",
        tone: "progress",
        transitional: true,
        since: null,
      };
    case "SENDING":
      return {
        label: "Sending",
        tone: "progress",
        transitional: true,
        since: null,
      };
    case "SUPPRESSED":
      return delivery.suppressionReason === "RECIPIENT_SUPPRESSED"
        ? {
            label: "Unsubscribed — not sent",
            tone: "attention",
            transitional: false,
            since: null,
          }
        : {
            label: "Delivery off — not sent",
            tone: "attention",
            transitional: false,
            since: null,
          };
    case "FAILED":
    case "EXHAUSTED":
      return {
        label: "Delivery failed",
        tone: "critical",
        transitional: false,
        since: null,
      };
    default:
      // An enum value this build doesn't know yet — the honest fallback used
      // everywhere else this contract is read.
      return {
        label: "Recorded",
        tone: "muted",
        transitional: false,
        since: null,
      };
  }
}
