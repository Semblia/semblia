import { describe, expect, it } from "vitest";
import type {
  V2ApiEnvelope,
  V2ErrorResponse,
  V2FormRequestDTO,
  V2FormRequestRecipientDTO,
  V2FormSummaryDTO,
  V2PaginatedResponse,
  V2ProjectDTO,
  V2ResponseDTO,
} from "@workspace/types";
import type {
  SembliaEnvelope,
  SembliaErrorBody,
  SembliaFormRequest,
  SembliaFormRequestRecipient,
  SembliaFormSummary,
  SembliaPage,
  SembliaProject,
  SembliaResponse,
} from "./types.js";

/**
 * Compile-time parity between the SDK's curated public types and the API's
 * wire DTOs: every server DTO must be assignable to its SDK type, so a field
 * the SDK promises can never drift from what the API actually returns.
 * `pnpm typecheck` is the gate; the runtime `it` below only keeps the file in
 * the vitest count.
 */

type Assert<T extends true> = T;

// Each line fails to compile if the server DTO stops being assignable to the
// SDK's curated type. Pure type-level — no runtime footprint.
type _Project = Assert<V2ProjectDTO extends SembliaProject ? true : false>;
type _FormSummary = Assert<
  V2FormSummaryDTO extends SembliaFormSummary ? true : false
>;
type _Response = Assert<V2ResponseDTO extends SembliaResponse ? true : false>;
type _FormRequest = Assert<
  V2FormRequestDTO extends SembliaFormRequest ? true : false
>;
type _Recipient = Assert<
  V2FormRequestRecipientDTO extends SembliaFormRequestRecipient ? true : false
>;
type _Page = Assert<
  V2PaginatedResponse<V2ProjectDTO> extends SembliaPage<SembliaProject>
    ? true
    : false
>;
type _Envelope = Assert<
  V2ApiEnvelope<V2ProjectDTO> extends SembliaEnvelope<SembliaProject>
    ? true
    : false
>;
type _ErrorBody = Assert<
  V2ErrorResponse["error"] extends SembliaErrorBody ? true : false
>;

describe("type parity", () => {
  it("is enforced by the typecheck gate", () => {
    expect(true).toBe(true);
  });
});
