import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { V2ResponseDTO } from "@workspace/types";
import { ResponseDetail } from "@/components/responses/response-detail";

function response(overrides: Partial<V2ResponseDTO> = {}): V2ResponseDTO {
  return {
    id: "resp_1",
    projectId: "proj_1",
    formId: "form_1",
    trustMode: "HMAC",
    idempotencyKey: null,
    payloadHash: null,
    answers: {
      authorName: "Anika Rao",
      authorEmail: "anika@example.com",
      content: "The onboarding review caught the risky bits before launch.",
      rating: 4,
    },
    ratingValue: 4,
    ratingScale: 5,
    moderationStatus: "FLAGGED",
    moderationReason: "Needs human review",
    moderatedByActorType: "user",
    moderatedByActorId: "user_123456789",
    moderatedAt: "2026-06-04T10:15:00.000Z",
    metadata: { moderationFlags: ["spam_link"] },
    createdAt: "2026-06-04T10:00:00.000Z",
    updatedAt: "2026-06-04T10:15:00.000Z",
    collectionForm: { id: "form_1", name: "Launch feedback" },
    annotations: [
      {
        id: "ann_1",
        projectId: "proj_1",
        submissionId: "resp_1",
        actorType: "user",
        actorId: "user_review",
        note: "Keep this for launch review.",
        labels: ["launch", "follow-up"],
        sentiment: "positive",
        metadata: null,
        createdAt: "2026-06-04T10:20:00.000Z",
        updatedAt: "2026-06-04T10:20:00.000Z",
      },
    ],
    moderationRuns: [
      {
        id: "run_1",
        artifactType: "TEXT",
        provider: "aws-comprehend",
        providerOperation: "DetectToxicContent",
        status: "SUCCEEDED",
        decision: "REVIEW",
        score: 0.82,
        flags: ["toxicity"],
        categories: { toxicity: 0.82, insult: 0.31 },
        reason: null,
        createdAt: "2026-06-04T10:10:00.000Z",
        completedAt: "2026-06-04T10:11:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("ResponseDetail", () => {
  it("surfaces moderation runs and reviewer notes", () => {
    render(<ResponseDetail response={response()} />);

    expect(screen.getByText("Last reviewed")).toBeTruthy();
    expect(screen.getByText("Reviewed by")).toBeTruthy();
    expect(screen.getByText("Provider checks")).toBeTruthy();
    expect(screen.getByText("Text")).toBeTruthy();
    expect(screen.getByText("Succeeded")).toBeTruthy();
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getAllByText("82%").length).toBeGreaterThan(0);
    expect(screen.getByText(/aws-comprehend/)).toBeTruthy();
    expect(screen.getByText("Toxicity")).toBeTruthy();

    expect(screen.getByText("Review notes")).toBeTruthy();
    expect(screen.getByText("Positive")).toBeTruthy();
    expect(screen.getByText("Keep this for launch review.")).toBeTruthy();
    expect(screen.getByText("launch")).toBeTruthy();
    expect(screen.getByText("follow-up")).toBeTruthy();
  });

  it("saves a reviewer note with labels and sentiment", async () => {
    const onCreateAnnotation = vi.fn().mockResolvedValue(undefined);

    render(
      <ResponseDetail
        response={response({ annotations: [], moderationRuns: [] })}
        onCreateAnnotation={onCreateAnnotation}
      />,
    );

    await userEvent.type(
      screen.getByLabelText(/add review note/i),
      "Escalate this before publishing.",
    );
    await userEvent.type(
      screen.getByLabelText(/labels/i),
      "urgent, launch, urgent",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/sentiment/i),
      "negative",
    );
    await userEvent.click(screen.getByRole("button", { name: /save note/i }));

    await waitFor(() =>
      expect(onCreateAnnotation).toHaveBeenCalledWith("resp_1", {
        note: "Escalate this before publishing.",
        labels: ["urgent", "launch"],
        sentiment: "negative",
      }),
    );
  });
});
