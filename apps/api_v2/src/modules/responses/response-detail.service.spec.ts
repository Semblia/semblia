import { describe, expect, it, vi } from "vitest";
import { EmailTemplateKey } from "@workspace/database/prisma";
import {
  ResponseDetailService,
  emailFromAnswers,
  mediaKind,
  primaryText,
} from "./response-detail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";
import type { MediaService } from "../storage/media.service.js";
import type { EmailDeliveryService } from "../email/email-delivery.service.js";

const PRIMARY_ANSWER = {
  fieldId: "q_text",
  type: "longText",
  role: "primaryText",
  value: "  The queue is the part I did not know I needed.  ",
};

const EMAIL_ANSWER = {
  fieldId: "q_email",
  type: "email",
  role: "authorEmail",
  value: "rowan@meridianlabs.test",
  private: true,
};

const ANSWERS = [PRIMARY_ANSWER, EMAIL_ANSWER];

/** The first call's single argument, asserted present so tests read cleanly. */
function idempotencyKeys(fn: unknown): string[] {
  return (fn as ReturnType<typeof vi.fn>).mock.calls.map(
    (call) => call[0].data.idempotencyKey as string,
  );
}

function firstArg<T>(fn: unknown): T {
  const call = (fn as ReturnType<typeof vi.fn>).mock.calls[0];
  if (!call) throw new Error("expected the mock to have been called");
  return call[0] as T;
}

type DeliveryCreate = {
  data: {
    template: string;
    subject: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
  };
};
type AnnotationCreate = {
  data: { labels: string[]; metadata: Record<string, unknown> };
};

function makeService(overrides: {
  client?: Record<string, unknown>;
  decrypted?: string | null;
  presign?: () => Promise<string>;
  enqueue?: ReturnType<typeof vi.fn>;
}) {
  const prisma = { client: overrides.client ?? {} } as unknown as PrismaService;
  const privateMetadata = {
    decryptAuthorEmail: vi.fn().mockReturnValue(overrides.decrypted ?? null),
  } as unknown as SubmissionPrivateMetadataService;
  const media = {
    mintPresignedGet:
      overrides.presign ?? vi.fn().mockResolvedValue("https://signed.test/a"),
  } as unknown as MediaService;
  const email = {
    enqueueDelivery: overrides.enqueue ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as EmailDeliveryService;

  return new ResponseDetailService(prisma, privateMetadata, media, email);
}

describe("media kind", () => {
  it("maps a content type to the control that can play it", () => {
    expect(mediaKind("video/webm")).toBe("VIDEO");
    expect(mediaKind("audio/mpeg")).toBe("AUDIO");
    expect(mediaKind("image/png")).toBe("IMAGE");
  });

  it("falls back to a download rather than offering a broken player", () => {
    expect(mediaKind("application/pdf")).toBe("FILE");
    expect(mediaKind("")).toBe("FILE");
  });
});

describe("reading answers", () => {
  it("finds the email in a private answer and trims it", () => {
    expect(emailFromAnswers(ANSWERS)).toBe("rowan@meridianlabs.test");
  });

  it("returns null rather than a blank string when there is no email", () => {
    expect(emailFromAnswers([PRIMARY_ANSWER])).toBeNull();
    expect(emailFromAnswers("not-an-array" as never)).toBeNull();
    // A malformed row must not take the whole read down with it.
    expect(emailFromAnswers([null, 7, EMAIL_ANSWER] as never)).toBe(
      "rowan@meridianlabs.test",
    );
  });

  it("reads the testimonial itself for quoting back", () => {
    expect(primaryText(ANSWERS)).toBe(
      "The queue is the part I did not know I needed.",
    );
  });
});

describe("contact", () => {
  const response = {
    id: "resp_1",
    projectId: "proj_1",
    origin: "FORM",
    authorName: "Rowan",
    answers: ANSWERS,
    annotations: [],
  };

  it("refuses to release an address without REVIEW_RESPONSES", async () => {
    const service = makeService({});
    const contact = await service.resolveContact(response, {
      permitted: false,
    });
    expect(contact).toMatchObject({ email: null, canContact: false });
    expect(contact.unavailableReason).toMatch(/Reviewer role/);
  });

  it("says why imported proof cannot be answered", async () => {
    const service = makeService({});
    const contact = await service.resolveContact(
      { ...response, origin: "IMPORT" },
      { permitted: true },
    );
    expect(contact.canContact).toBe(false);
    expect(contact.unavailableReason).toMatch(/never wrote to you/);
  });

  it("prefers the encrypted column over the private answer", async () => {
    const service = makeService({
      decrypted: "encrypted@meridianlabs.test",
      client: {
        formResponsePrivateMetadata: {
          findUnique: vi.fn().mockResolvedValue({ authorEmailEncrypted: "x" }),
        },
      },
    });
    const contact = await service.resolveContact(response, {
      permitted: true,
    });
    expect(contact).toEqual({
      email: "encrypted@meridianlabs.test",
      canContact: true,
      unavailableReason: null,
    });
  });

  it("falls back to the private answer for pre-encryption records", async () => {
    const service = makeService({
      decrypted: null,
      client: {
        formResponsePrivateMetadata: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      },
    });
    const contact = await service.resolveContact(response, {
      permitted: true,
    });
    expect(contact.email).toBe("rowan@meridianlabs.test");
  });
});

describe("media", () => {
  it("keeps an asset that cannot be signed, with no url", async () => {
    const service = makeService({
      presign: vi.fn().mockRejectedValue(new Error("storage down")),
      client: {
        mediaAsset: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "asset_1",
              contentType: "video/webm",
              byteSize: 10,
              visibility: "PRIVATE",
              createdAt: new Date("2026-08-01T00:00:00.000Z"),
            },
          ]),
        },
      },
    });

    // Dropping it would tell the reviewer the submission had no video at all,
    // which is a different and wrong conclusion.
    await expect(service.resolveMedia("resp_1")).resolves.toEqual([
      {
        assetId: "asset_1",
        kind: "VIDEO",
        contentType: "video/webm",
        byteSize: 10,
        url: null,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("thank-you", () => {
  const baseResponse = {
    id: "resp_1",
    projectId: "proj_1",
    origin: "FORM",
    authorName: "Rowan",
    answers: ANSWERS,
    project: { name: "Agency Portfolio" },
    annotations: [],
  };

  /**
   * `$transaction(cb)` hands the callback the same client, which is what the
   * real Prisma interactive transaction does with a scoped tx — good enough to
   * assert what was written and in which branch.
   */
  function thankYouClient(
    extra: Record<string, unknown> = {},
    options: { existingDelivery?: boolean } = {},
  ) {
    const client: Record<string, unknown> = {
      formResponse: {
        findUnique: vi.fn().mockResolvedValue(baseResponse),
      },
      formResponsePrivateMetadata: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      emailDelivery: {
        findUnique: vi
          .fn()
          .mockResolvedValue(
            options.existingDelivery ? { id: "delivery_existing" } : null,
          ),
        create: vi.fn().mockResolvedValue({ id: "delivery_1" }),
      },
      formResponseAnnotation: { create: vi.fn().mockResolvedValue({}) },
      ...extra,
    };
    client.$transaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback(client),
    );
    return client as Record<string, never> & {
      emailDelivery: {
        findUnique: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
      };
      formResponseAnnotation: { create: ReturnType<typeof vi.fn> };
      formResponse: { findUnique: ReturnType<typeof vi.fn> };
    };
  }

  it("sends the default thank-you and records it against the response", async () => {
    const client = thankYouClient();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ client, enqueue });

    const result = await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "DEFAULT",
      actorId: "user_1",
    });

    expect(result).toEqual({
      sentTo: "rowan@meridianlabs.test",
      kind: "DEFAULT",
    });
    expect(enqueue).toHaveBeenCalledWith("delivery_1");

    const delivery = firstArg<DeliveryCreate>(client.emailDelivery.create);
    expect(delivery.data.template).toBe(EmailTemplateKey.RESPONSE_THANK_YOU);
    expect(delivery.data.subject).toBe("Thank you, Rowan — Agency Portfolio");
    expect(delivery.data.payload).toMatchObject({
      kind: "DEFAULT",
      projectName: "Agency Portfolio",
      quote: "The queue is the part I did not know I needed.",
    });

    const annotation = firstArg<AnnotationCreate>(
      client.formResponseAnnotation.create,
    );
    expect(annotation.data.labels).toEqual(["thank-you"]);
    expect(annotation.data.metadata).toMatchObject({ kind: "DEFAULT" });
  });

  it("addresses the same message to the same key, so a double click is one email", async () => {
    const client = thankYouClient();
    const service = makeService({ client });

    await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "DEFAULT",
      actorId: null,
    });
    await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "DEFAULT",
      actorId: null,
    });

    const keys = idempotencyKeys(client.emailDelivery.create);
    expect(keys[0]).toBe(keys[1]);
  });

  // Regression: the delivery was upserted (so the second press sent no second
  // email) but the annotation was created unconditionally beside it, leaving
  // two "thanked" records for one email — and a record that claimed to have
  // thanked the author twice.
  it("does not record a second thank-you when the email was already sent", async () => {
    const client = thankYouClient({}, { existingDelivery: true });
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ client, enqueue });

    const result = await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "DEFAULT",
      actorId: "user_1",
    });

    expect(result).toEqual({
      sentTo: "rowan@meridianlabs.test",
      kind: "DEFAULT",
    });
    expect(client.emailDelivery.create).not.toHaveBeenCalled();
    expect(client.formResponseAnnotation.create).not.toHaveBeenCalled();
    // Nor is an already-queued delivery queued a second time.
    expect(enqueue).not.toHaveBeenCalled();
  });

  // The unique index on idempotencyKey is what actually decides a race: two
  // simultaneous sends both pass the findUnique check and both insert. The
  // loser must read the winner's row, not fail the whole transaction.
  it("yields to the winner when two identical sends race the unique index", async () => {
    const client = thankYouClient();
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    client.emailDelivery.create.mockRejectedValueOnce(p2002);
    client.emailDelivery.findUnique
      .mockResolvedValueOnce(null) // the pre-check, before the other request lands
      .mockResolvedValueOnce({ id: "delivery_winner" }); // the re-read after P2002

    const enqueue = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ client, enqueue });

    await expect(
      service.sendThankYou({
        responseId: "resp_1",
        projectId: "proj_1",
        kind: "DEFAULT",
        actorId: "user_1",
      }),
    ).resolves.toEqual({ sentTo: "rowan@meridianlabs.test", kind: "DEFAULT" });

    expect(client.formResponseAnnotation.create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("still surfaces a write failure that is not a duplicate", async () => {
    const client = thankYouClient();
    client.emailDelivery.create.mockRejectedValueOnce(
      new Error("disk on fire"),
    );
    const service = makeService({ client });

    await expect(
      service.sendThankYou({
        responseId: "resp_1",
        projectId: "proj_1",
        kind: "DEFAULT",
        actorId: null,
      }),
    ).rejects.toThrow(/disk on fire/);
  });

  it("writes the delivery and its annotation in one transaction", async () => {
    const client = thankYouClient();
    const service = makeService({ client });

    await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "DEFAULT",
      actorId: "user_1",
    });

    // A delivery with no annotation would leave the screen offering to send a
    // thank-you the author had already received.
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.emailDelivery.create).toHaveBeenCalledTimes(1);
    expect(client.formResponseAnnotation.create).toHaveBeenCalledTimes(1);
  });

  it("gives a different message its own key", async () => {
    const client = thankYouClient();
    const service = makeService({ client });

    await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "CUSTOM",
      message: "Thank you sincerely.",
      actorId: null,
    });
    await service.sendThankYou({
      responseId: "resp_1",
      projectId: "proj_1",
      kind: "CUSTOM",
      message: "A different note entirely.",
      actorId: null,
    });

    const keys = idempotencyKeys(client.emailDelivery.create);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("refuses a custom thank-you with no words in it", async () => {
    const service = makeService({ client: thankYouClient() });
    await expect(
      service.sendThankYou({
        responseId: "resp_1",
        projectId: "proj_1",
        kind: "CUSTOM",
        message: "   ",
        actorId: null,
      }),
    ).rejects.toThrow(/needs a message/);
  });

  it("refuses to invite somebody to a form in another project", async () => {
    const client = thankYouClient({
      form: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    const service = makeService({ client });
    await expect(
      service.sendThankYou({
        responseId: "resp_1",
        projectId: "proj_1",
        kind: "INVITE",
        formId: "form_elsewhere",
        actorId: null,
      }),
    ).rejects.toThrow(/not in this project/);
  });

  it("refuses to invite somebody to a link that would not work", async () => {
    const client = thankYouClient({
      form: {
        findFirst: vi.fn().mockResolvedValue({
          id: "form_1",
          name: "Case study intake",
          slug: "case-study",
          status: "DRAFT",
        }),
      },
    });
    const service = makeService({ client });
    await expect(
      service.sendThankYou({
        responseId: "resp_1",
        projectId: "proj_1",
        kind: "INVITE",
        formId: "form_1",
        actorId: null,
      }),
    ).rejects.toThrow(/not published/);
  });

  it("refuses to write to an imported author, who has no address", async () => {
    const client = thankYouClient({
      formResponse: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...baseResponse, origin: "IMPORT" }),
      },
    });
    const service = makeService({ client });
    await expect(
      service.sendThankYou({
        responseId: "resp_1",
        projectId: "proj_1",
        kind: "DEFAULT",
        actorId: null,
      }),
    ).rejects.toThrow(/never wrote to you/);
    expect(client.emailDelivery.create).not.toHaveBeenCalled();
  });
});

describe("reading a recorded thank-you", () => {
  it("returns the most recent one, whatever order they arrive in", () => {
    const service = makeService({});
    const thankYou = service.readThankYou({
      id: "resp_1",
      projectId: "proj_1",
      origin: "FORM",
      authorName: null,
      answers: [],
      annotations: [
        {
          id: "a1",
          actorId: "user_1",
          labels: ["thank-you"],
          note: null,
          metadata: { kind: "DEFAULT" },
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        {
          id: "a2",
          actorId: "user_2",
          labels: ["thank-you"],
          note: "Thanks again",
          metadata: { kind: "CUSTOM" },
          createdAt: new Date("2026-08-05T00:00:00.000Z"),
        },
        {
          id: "a3",
          actorId: null,
          labels: ["note"],
          note: "unrelated",
          metadata: null,
          createdAt: new Date("2026-08-09T00:00:00.000Z"),
        },
      ],
    });

    expect(thankYou).toMatchObject({
      kind: "CUSTOM",
      message: "Thanks again",
      sentByActorId: "user_2",
    });
  });

  it("is null when nobody has been thanked", () => {
    const service = makeService({});
    expect(
      service.readThankYou({
        id: "resp_1",
        projectId: "proj_1",
        origin: "FORM",
        authorName: null,
        answers: [],
        annotations: [],
      }),
    ).toBeNull();
  });
});
