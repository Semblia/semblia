import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { V2ResponseDetailDTO } from "@workspace/types";
import {
  AuthorRail,
  Testimonial,
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

  it("reads sizes the way a person does", () => {
    expect(fileSize(512)).toBe("512 B");
    expect(fileSize(4_718_592)).toBe("4.5 MB");
    expect(fileSize(null)).toBeNull();
  });
});
