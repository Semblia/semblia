import type { V2EmailDeliveryStateDTO } from "@workspace/types";

export type EmailDeliveryStateRecord = {
  status: string;
  suppressionReason: string | null;
  sentAt: Date | null;
};

export function toDeliveryStateDto(
  delivery: EmailDeliveryStateRecord,
): V2EmailDeliveryStateDTO {
  return {
    status: delivery.status as V2EmailDeliveryStateDTO["status"],
    suppressionReason:
      delivery.suppressionReason as V2EmailDeliveryStateDTO["suppressionReason"],
    sentAt: delivery.sentAt?.toISOString() ?? null,
  };
}
