import { describe, expect, it } from "vitest";
import type { V2ResponseDTO } from "@workspace/types";
import { responseToTestimonial } from "../../lib/widgets/response-to-testimonial";

describe("responseToTestimonial", () => {
  it("preserves null form provenance for imported proof", () => {
    const response = {
      id: "response_1",
      projectId: "project_1",
      origin: "IMPORT",
      formId: null,
      versionId: null,
      version: null,
      trustMode: "IMPORT",
      answers: [
        {
          fieldId: "import-primary-text",
          type: "longText",
          role: "primaryText",
          labelSnapshot: "Imported proof",
          value: "Semblia helped us ship.",
          publishable: true,
          usedInWidget: true,
        },
      ],
      ratingValue: 5,
      ratingScale: 5,
      authorName: "Ada Lovelace",
      authorRole: null,
      authorCompany: null,
      authorAvatarAssetId: null,
      consent: {
        canPublishText: true,
        canPublishName: true,
        canPublishCompany: true,
        canPublishRole: true,
        canPublishAvatar: false,
        canEditForClarity: false,
      },
      reviewStatus: "PENDING",
      publishStatus: "PRIVATE",
      moderationReason: null,
      moderatedByActorType: null,
      moderatedByActorId: null,
      moderatedAt: null,
      sourceMetadata: {},
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
      form: null,
      annotations: [],
      moderationRuns: [],
    } as unknown as V2ResponseDTO;

    expect(responseToTestimonial(response)).toMatchObject({ formId: null });
  });
});
