import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  V2ResponseDTO,
  V2SubmissionModerationRunDTO,
} from "@workspace/types";
import { ResponseRow } from "@/components/responses/response-row";
import { summarizeModeration } from "@/components/responses/moderation-verdict";

function makeResponse(overrides: Partial<V2ResponseDTO> = {}): V2ResponseDTO {
  return {
    id: "response_1",
    projectId: "project_1",
    origin: "FORM",
    formId: "form_1",
    versionId: "version_1",
    version: 1,
    trustMode: "ORIGIN",
    answers: [
      {
        fieldId: "testimonial",
        type: "longText",
        role: "primaryText",
        labelSnapshot: "Testimonial",
        value: "Semblia helped us ship.",
        publishable: true,
        usedInWidget: true,
      },
    ],
    ratingValue: null,
    ratingScale: null,
    authorName: "Ada Lovelace",
    authorRole: null,
    authorCompany: null,
    authorAvatarAssetId: null,
    consent: {
      canPublishText: true,
      canPublishName: true,
      canPublishRole: true,
      canPublishCompany: true,
      canPublishAvatar: true,
      canEditForClarity: true,
    },
    publishable: true,
    publishBlockedReason: null,
    reviewStatus: "APPROVED",
    publishStatus: "PRIVATE",
    moderationReason: null,
    moderatedByActorType: null,
    moderatedByActorId: null,
    moderatedAt: null,
    sourceMetadata: {},
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
    form: {
      id: "form_1",
      name: "Testimonials",
      slug: "t",
      intent: "TESTIMONIAL",
    },
    annotations: [],
    moderationRuns: [],
    ...overrides,
  } as V2ResponseDTO;
}

function noopHandlers() {
  return {
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onTogglePublish: vi.fn(),
    onDelete: vi.fn(),
  };
}

describe("ResponseRow — never offers an action the API will refuse", () => {
  it("disables Feature and states the reason when consent was withheld", () => {
    render(
      <ResponseRow
        response={makeResponse({
          publishable: false,
          publishBlockedReason:
            "The author didn't consent to publishing their name.",
        })}
        {...noopHandlers()}
      />,
    );

    const feature = screen.getByRole("button", { name: "Feature" });
    expect(feature.hasAttribute("disabled")).toBe(true);
    // The reason must be readable where the control is, not only in a tooltip
    // on a disabled element — which receives no pointer events at all.
    expect(
      screen.getByText("The author didn't consent to publishing their name."),
    ).toBeTruthy();
  });

  it("enables Feature when consent permits publishing", () => {
    render(<ResponseRow response={makeResponse()} {...noopHandlers()} />);
    const feature = screen.getByRole("button", { name: "Feature" });
    expect(feature.hasAttribute("disabled")).toBe(false);
  });
});

describe("ResponseRow — honest values", () => {
  it("renders a rating with its scale, never a bare number", () => {
    render(
      <ResponseRow
        response={makeResponse({ ratingValue: 4, ratingScale: 10 })}
        {...noopHandlers()}
      />,
    );
    expect(screen.getByLabelText("Rated 4 out of 10")).toBeTruthy();
  });

  it("renders no rating at all when the scale is unknown", () => {
    render(
      <ResponseRow
        response={makeResponse({ ratingValue: 4, ratingScale: null })}
        {...noopHandlers()}
      />,
    );
    expect(screen.queryByLabelText(/Rated/)).toBeNull();
  });

  it("names a recorded testimonial instead of rendering an em dash", () => {
    render(
      <ResponseRow
        response={makeResponse({ answers: [] })}
        {...noopHandlers()}
      />,
    );
    expect(
      screen.getByText("Recorded testimonial — no written text"),
    ).toBeTruthy();
  });
});

describe("summarizeModeration", () => {
  function run(
    overrides: Partial<V2SubmissionModerationRunDTO>,
  ): V2SubmissionModerationRunDTO {
    return {
      id: `run_${Math.random()}`,
      artifactType: "TEXT",
      provider: "aws",
      providerOperation: "detect",
      status: "SUCCEEDED",
      decision: "APPROVE",
      score: null,
      flags: [],
      categories: {},
      reason: null,
      createdAt: "2026-07-22T00:00:00.000Z",
      completedAt: "2026-07-22T00:00:01.000Z",
      ...overrides,
    } as V2SubmissionModerationRunDTO;
  }

  it("reports the strictest decision, so a pass can't mask a flag", () => {
    const summary = summarizeModeration([
      run({ decision: "APPROVE" }),
      run({ artifactType: "VIDEO_FRAME", decision: "REJECT" }),
      run({ artifactType: "TRANSCRIPT", decision: "REVIEW" }),
    ]);
    expect(summary.decision).toBe("REJECT");
  });

  it("surfaces a failed check rather than letting it read as clean", () => {
    const summary = summarizeModeration([
      run({ decision: "APPROVE" }),
      run({ artifactType: "IMAGE", status: "FAILED", decision: null }),
    ]);
    expect(summary.failed).toBe(true);
  });

  it("reports work still in flight", () => {
    const summary = summarizeModeration([
      run({ status: "RUNNING", decision: null, completedAt: null }),
    ]);
    expect(summary.pending).toBe(true);
  });

  it("dedupes flags raised across several artifacts", () => {
    const summary = summarizeModeration([
      run({ flags: ["PROFANITY"] }),
      run({ artifactType: "TRANSCRIPT", flags: ["PROFANITY", "HATE_SPEECH"] }),
    ]);
    expect(summary.flags.sort()).toEqual(["HATE_SPEECH", "PROFANITY"]);
  });

  it("reports nothing to say when no check ever ran", () => {
    expect(summarizeModeration([]).empty).toBe(true);
  });
});
