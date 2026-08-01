import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  V2ResponseDTO,
  V2SubmissionModerationRunDTO,
} from "@workspace/types";
import { ResponseQueueRow } from "@/components/responses/response-queue-row";
import {
  AuthorRail,
  Testimonial,
  DecisionBar,
} from "@/components/responses/response-detail";
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

function renderRow(response: V2ResponseDTO) {
  return render(
    <ResponseQueueRow
      response={response}
      highlighted={false}
      selected={false}
      selectionActive={false}
      busy={false}
      onOpen={vi.fn()}
      onSelectToggle={vi.fn()}
      onApprove={vi.fn()}
      onReject={vi.fn()}
    />,
  );
}

/** The detail page's record surface, rebuilt from its pure pieces. */
function renderRecord(response: V2ResponseDTO) {
  return render(
    <>
      <AuthorRail response={response} />
      <Testimonial response={response} />
      <DecisionBar
        response={response}
        busy={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onTogglePublish={vi.fn()}
      />
    </>,
  );
}

describe("queue row — anatomy", () => {
  it("carries no permanently-visible action strip", () => {
    // Actions are hover/focus-revealed and overlay the timestamp, so they cost
    // the row no height and cause no reflow when they appear. A row that always
    // renders three labelled buttons turns a queue into a form and added ~40px
    // to every row in the first build.
    renderRow(makeResponse({ reviewStatus: "PENDING" }));
    const approve = screen.getByRole("button", {
      name: "Approve response from Ada Lovelace",
    });
    const cluster = approve.parentElement;

    expect(cluster?.className).toContain("opacity-0");
    expect(cluster?.className).toContain("group-hover/row:opacity-100");
    expect(cluster?.className).toContain("group-focus-within/row:opacity-100");
    // Overlaid, not stacked: it must not participate in the row's flow.
    expect(cluster?.className).toContain("absolute");
  });

  it("names its actions for assistive technology even while hidden", () => {
    renderRow(makeResponse({ reviewStatus: "PENDING" }));
    expect(
      screen.getByRole("button", {
        name: "Approve response from Ada Lovelace",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Reject response from Ada Lovelace" }),
    ).toBeTruthy();
  });

  it("uses the design-system checkbox, not a native input", () => {
    const { container } = renderRow(makeResponse());
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(
      screen.getByRole("checkbox", {
        name: "Select response from Ada Lovelace",
      }),
    ).toBeTruthy();
  });

  it("exposes review state to a screen reader without spending a badge", () => {
    renderRow(makeResponse({ reviewStatus: "PENDING" }));
    expect(screen.getByText("Pending review")).toBeTruthy();
  });
});

describe("honest values", () => {
  it("renders a rating with its scale, never a bare number", () => {
    renderRow(makeResponse({ ratingValue: 4, ratingScale: 10 }));
    expect(screen.getByLabelText("Rated 4 out of 10")).toBeTruthy();
  });

  it("renders no rating at all when the scale is unknown", () => {
    renderRow(makeResponse({ ratingValue: 4, ratingScale: null }));
    expect(screen.queryByLabelText(/Rated/)).toBeNull();
  });

  it("names a recording instead of rendering an em dash for missing text", () => {
    renderRow(makeResponse({ answers: [] }));
    expect(screen.getByText("Recorded, no written text")).toBeTruthy();
  });
});

describe("record — honest values", () => {
  it("humanizes the trust mode instead of printing the raw enum", () => {
    renderRecord(makeResponse({ trustMode: "ORIGIN" }));

    expect(screen.getByText("Origin-checked submit")).toBeTruthy();
    expect(screen.queryByText("ORIGIN")).toBeNull();
  });

  it("renders a multi-select answer instead of dropping it", () => {
    renderRecord(
      makeResponse({
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
          {
            fieldId: "products",
            type: "multiSelect",
            role: null,
            labelSnapshot: "Which products do you use?",
            value: ["Forms", "Widgets"],
            publishable: true,
            usedInWidget: false,
          },
        ],
      } as Partial<V2ResponseDTO>),
    );

    expect(screen.getByText("Which products do you use?")).toBeTruthy();
    expect(screen.getByText("Forms, Widgets")).toBeTruthy();
  });
});

describe("record — never offers an action the API will refuse", () => {
  it("disables featuring and states the reason when consent was withheld", () => {
    renderRecord(
      makeResponse({
        publishable: false,
        publishBlockedReason:
          "The author didn't consent to publishing their name.",
      }),
    );

    const feature = screen.getByRole("button", { name: /Feature in widgets/ });
    expect(feature.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText("The author didn't consent to publishing their name."),
    ).toBeTruthy();
  });

  it("enables featuring when consent permits publishing", () => {
    renderRecord(makeResponse());
    const feature = screen.getByRole("button", { name: /Feature in widgets/ });
    expect(feature.hasAttribute("disabled")).toBe(false);
  });

  it("keeps a route back to imported proof at its original source", () => {
    renderRecord(
      makeResponse({
        origin: "IMPORT",
        form: null,
        sourceMetadata: {
          source: "testimonial-to",
          sourceUrl: "https://testimonial.to/example",
        },
      }),
    );

    expect(
      screen
        .getByRole("link", { name: "Source: Testimonial.to" })
        .getAttribute("href"),
    ).toBe("https://testimonial.to/example");
  });

  it("refuses to link a source over an unsafe protocol", () => {
    renderRecord(
      makeResponse({
        origin: "IMPORT",
        form: null,
        sourceMetadata: {
          source: "testimonial-to",
          sourceUrl: "javascript:alert(1)",
        },
      }),
    );

    expect(screen.queryByRole("link", { name: /Source:/ })).toBeNull();
  });

  it("weights approve above reject on a pending record", () => {
    renderRecord(makeResponse({ reviewStatus: "PENDING" }));
    const approve = screen.getByRole("button", { name: "Approve" });
    const reject = screen.getByRole("button", { name: "Reject" });
    // Approve carries the raised fill; reject is a quiet ghost. They are the
    // same size and different weight, never the same button in two colours.
    expect(approve.className).toContain("ink-raised");
    expect(reject.className).not.toContain("ink-raised");
  });
});

describe("summarizeModeration", () => {
  function run(
    overrides: Partial<V2SubmissionModerationRunDTO>,
  ): V2SubmissionModerationRunDTO {
    return {
      id: `run_${overrides.artifactType ?? "TEXT"}_${overrides.status ?? "ok"}`,
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
