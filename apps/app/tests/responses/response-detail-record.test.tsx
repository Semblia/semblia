import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  V2EmailDeliveryStateDTO,
  V2ResponseDetailDTO,
  V2ResponseThankYouDTO,
} from "@workspace/types";
import {
  AuthorRail,
  Testimonial,
  ThankYouAction,
} from "@/components/responses/response-detail";
import { ResponseMedia, fileSize } from "@/components/responses/response-media";

function makeDetail(
  overrides: Partial<V2ResponseDetailDTO> = {},
): V2ResponseDetailDTO {
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
        fieldId: "q_text",
        type: "longText",
        role: "primaryText",
        labelSnapshot: "Tell us about your experience",
        value: "We shipped our wall in an afternoon.",
        publishable: true,
        usedInWidget: true,
      },
      {
        fieldId: "q_email",
        type: "email",
        role: "authorEmail",
        labelSnapshot: "Your email",
        value: "rowan@meridianlabs.test",
        publishable: false,
        usedInWidget: false,
        private: true,
      },
      {
        fieldId: "q_referral",
        type: "singleSelect",
        role: "custom",
        labelSnapshot: "How did you hear about us?",
        value: "A colleague",
        publishable: false,
        usedInWidget: false,
      },
      {
        fieldId: "q_video",
        type: "videoUpload",
        role: "custom",
        labelSnapshot: "Record a short video",
        value: "asset_1",
        publishable: true,
        usedInWidget: false,
      },
    ],
    ratingValue: null,
    ratingScale: null,
    authorName: "Rowan Iyer",
    authorRole: "VP Marketing",
    authorCompany: "Meridian Labs",
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
    reviewStatus: "PENDING",
    publishStatus: "PRIVATE",
    moderationReason: null,
    moderatedByActorType: null,
    moderatedByActorId: null,
    moderatedAt: null,
    sourceMetadata: {},
    createdAt: "2026-08-07T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
    form: {
      id: "form_1",
      name: "Share your experience",
      slug: "t",
      intent: "TESTIMONIAL",
    },
    annotations: [],
    moderationRuns: [],
    contact: {
      email: "rowan@meridianlabs.test",
      canContact: true,
      unavailableReason: null,
    },
    media: [
      {
        assetId: "asset_1",
        kind: "VIDEO",
        contentType: "video/webm",
        byteSize: 4_718_592,
        url: "https://signed.test/a.webm",
        createdAt: "2026-08-07T00:00:00.000Z",
      },
    ],
    thankYou: null,
    ...overrides,
  };
}

describe("the record's contact line", () => {
  it("shows the submitter's address as something you can write to", () => {
    render(<AuthorRail response={makeDetail()} />);
    const link = screen.getByRole("link", {
      name: "rowan@meridianlabs.test",
    });
    expect(link.getAttribute("href")).toBe("mailto:rowan@meridianlabs.test");
  });

  it("states why there is no address instead of leaving a gap", () => {
    render(
      <AuthorRail
        response={makeDetail({
          contact: {
            email: null,
            canContact: false,
            unavailableReason: "Imported proof carries no address.",
          },
        })}
      />,
    );
    expect(screen.getByText("Imported proof carries no address.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  });

  it("renders a plain list row unchanged, with no contact block", () => {
    // The same component serves the list DTO, which has no contact block at
    // all — it must not invent one, or read `undefined.email`.
    const detail: Record<string, unknown> = { ...makeDetail() };
    delete detail.contact;
    delete detail.media;
    delete detail.thankYou;

    render(<AuthorRail response={detail as never} />);
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  });
});

describe("the transcript", () => {
  it("keeps every question with its answer", () => {
    render(<Testimonial response={makeDetail()} />);
    expect(screen.getByText("Tell us about your experience")).toBeTruthy();
    expect(screen.getByText("Your email")).toBeTruthy();
    expect(screen.getByText("How did you hear about us?")).toBeTruthy();
  });

  it("marks a private answer as one that is never published", () => {
    render(<Testimonial response={makeDetail()} />);
    expect(screen.getByText("private · never published")).toBeTruthy();
    expect(screen.getByText("not for publication")).toBeTruthy();
  });

  it("never prints an asset id as if it were the answer", () => {
    render(<Testimonial response={makeDetail()} />);
    // The upload answer's value is a MediaAsset id; the attachment section
    // renders it, and the transcript must not repeat it as text.
    expect(screen.queryByText("asset_1")).toBeNull();
    expect(screen.queryByText("Record a short video")).toBeNull();
  });
});

describe("attachments", () => {
  it("gives a recording a player rather than a filename", () => {
    const { container } = render(<ResponseMedia media={makeDetail().media} />);
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe("https://signed.test/a.webm");
    expect(video?.hasAttribute("controls")).toBe(true);
  });

  it("says a file exists but could not be opened, rather than hiding it", () => {
    render(<ResponseMedia media={[{ ...makeDetail().media[0], url: null }]} />);
    expect(screen.getByText(/could not be opened/)).toBeTruthy();
  });

  it("renders nothing at all when there is nothing attached", () => {
    const { container } = render(<ResponseMedia media={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // Only ACTIVE assets reach `media`, and upload answers are kept out of the
  // transcript — so an abandoned or deleted upload used to leave no trace, and
  // the submission read as if the question had been skipped.
  it("accounts for an upload whose asset never became available", () => {
    render(
      <ResponseMedia media={[]} unresolvedUploads={["Record a short video"]} />,
    );
    expect(screen.getByText("Record a short video")).toBeTruthy();
    expect(screen.getByText(/never finished uploading/)).toBeTruthy();
  });

  it("names the question for an upload the record cannot show", () => {
    const detail = makeDetail({ media: [] });
    render(<Testimonial response={detail} />);
    // The asset id must still never appear as the answer's text.
    expect(screen.queryByText("asset_1")).toBeNull();
    expect(screen.getByText(/never finished uploading/)).toBeTruthy();
  });

  it("reads sizes the way a person does", () => {
    expect(fileSize(512)).toBe("512 B");
    expect(fileSize(4_718_592)).toBe("4.5 MB");
    expect(fileSize(null)).toBeNull();
  });
});

// ── Thank-you delivery honesty ──────────────────────────────────────────────
//
// The record used to render "Thank-you sent" from the annotation alone, which
// is only true when `delivery.status === "SENT"`. A thank-you the API queued,
// suppressed, or failed to deliver must never read as delivered.

function makeThankYou(
  overrides: Partial<V2ResponseThankYouDTO> = {},
): V2ResponseThankYouDTO {
  return {
    kind: "DEFAULT",
    message: null,
    formId: null,
    formName: null,
    sentAt: "2026-08-10T00:00:00.000Z",
    sentByActorId: null,
    delivery: null,
    ...overrides,
  };
}

function delivery(
  overrides: Partial<V2EmailDeliveryStateDTO>,
): V2EmailDeliveryStateDTO {
  return {
    status: "SENT",
    suppressionReason: null,
    sentAt: null,
    ...overrides,
  };
}

function renderThankYouLine(thankYou: V2ResponseThankYouDTO) {
  return render(
    <ThankYouAction
      slug="acme"
      projectName="Acme"
      response={makeDetail({ thankYou })}
    />,
  );
}

describe("the thank-you delivery line", () => {
  it("keeps the pre-delivery-tracking display when delivery can't be resolved", () => {
    renderThankYouLine(makeThankYou({ delivery: null }));
    expect(screen.getByText(/Thank-you sent/)).toBeTruthy();
  });

  it("says sent, with the delivery time, once the provider accepts it", () => {
    renderThankYouLine(
      makeThankYou({
        delivery: delivery({
          status: "SENT",
          sentAt: "2026-08-10T01:00:00.000Z",
        }),
      }),
    );
    const line = screen.getByText(/Thank-you sent/);
    expect(line.className).toContain("text-muted-foreground");
  });

  it.each(["PENDING", "ENQUEUED", "SENDING"] as const)(
    "says queued while delivery is %s, never sent",
    (status) => {
      renderThankYouLine(makeThankYou({ delivery: delivery({ status }) }));
      expect(screen.getByText("Thank-you queued")).toBeTruthy();
      expect(screen.queryByText(/Thank-you sent/)).toBeNull();
    },
  );

  it("says delivery is off, not sent, when suppressed for that reason", () => {
    renderThankYouLine(
      makeThankYou({
        delivery: delivery({
          status: "SUPPRESSED",
          suppressionReason: "DELIVERY_DISABLED",
        }),
      }),
    );
    const line = screen.getByText("Thank-you recorded — email delivery is off");
    expect(line).toBeTruthy();
    expect(line.className).toContain("text-warning");
  });

  it("says the recipient unsubscribed, not sent, when suppressed for that reason", () => {
    renderThankYouLine(
      makeThankYou({
        delivery: delivery({
          status: "SUPPRESSED",
          suppressionReason: "RECIPIENT_SUPPRESSED",
        }),
      }),
    );
    expect(
      screen.getByText("Thank-you not sent — recipient unsubscribed"),
    ).toBeTruthy();
  });

  it.each(["FAILED", "EXHAUSTED"] as const)(
    "says delivery failed when the provider reports %s",
    (status) => {
      renderThankYouLine(makeThankYou({ delivery: delivery({ status }) }));
      const line = screen.getByText("Thank-you delivery failed");
      expect(line.className).toContain("text-destructive");
    },
  );
});
