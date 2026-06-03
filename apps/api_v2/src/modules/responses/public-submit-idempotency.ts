import { ConflictException } from "@nestjs/common";
import { Prisma, PublicSubmitSurface } from "@workspace/database/prisma";

type PublicSubmitIdempotencyRecord = {
  payloadHash: string;
  responseBody: Prisma.JsonValue;
};

export function publicSubmitIdempotencyWhere(
  projectId: string,
  surface: PublicSubmitSurface,
  idempotencyKey: string,
) {
  return {
    projectId_surface_idempotencyKey: {
      projectId,
      surface,
      idempotencyKey,
    },
  };
}

export function replayCompletedPublicSubmit(
  existing: PublicSubmitIdempotencyRecord,
  payloadHash: string,
) {
  if (existing.payloadHash !== payloadHash) {
    throw new ConflictException(
      "Idempotency key reused with a different payload",
    );
  }

  if (!hasCompletedPublicSubmitResponse(existing.responseBody)) {
    throw new ConflictException("Idempotency key is already processing");
  }

  return existing.responseBody;
}

function hasCompletedPublicSubmitResponse(
  value: Prisma.JsonValue,
): value is Prisma.JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.id === "string"
  );
}
