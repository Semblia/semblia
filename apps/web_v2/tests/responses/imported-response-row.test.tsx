import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { V2ResponseDTO } from "@workspace/types";
import { ResponseRow } from "@/components/responses/response-row";

const importedResponse = {
  id: "response_1",
  projectId: "project_1",
  origin: "IMPORT",
  formId: null,
  versionId: null,
  version: null,
  trustMode: "IMPORT",
  answers: [],
  ratingValue: null,
  ratingScale: null,
  authorName: "Ada",
  authorRole: null,
  authorCompany: null,
  authorAvatarAssetId: null,
  consent: {},
  reviewStatus: "PENDING",
  publishStatus: "PRIVATE",
  moderationReason: null,
  moderatedByActorType: null,
  moderatedByActorId: null,
  moderatedAt: null,
  sourceMetadata: {
    source: "testimonial-to",
    sourceUrl: "https://testimonial.to/example",
  },
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  form: null,
  annotations: [],
  moderationRuns: [],
} as unknown as V2ResponseDTO;

describe("ResponseRow imported proof", () => {
  it("renders a source link when the imported record has no form", () => {
    render(
      <ResponseRow
        response={importedResponse}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onTogglePublish={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("link", { name: "Source: Testimonial.to" })
        .getAttribute("href"),
    ).toBe("https://testimonial.to/example");
  });
});
