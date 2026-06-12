import { ConfigService } from "@nestjs/config";
import { EmailTemplateKey } from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import {
  ResendMailerService,
  type ResendClient,
} from "./resend-mailer.service.js";

const rendered = {
  subject: "Welcome",
  text: "Hello from Semblia",
  html: "<p>Hello from Semblia</p>",
};

const delivery = {
  id: "email_1",
  userId: "user_1",
  projectId: "project_1",
  recipientEmail: "ada@example.com",
  template: EmailTemplateKey.NOTIFICATION,
  idempotencyKey: "notification:notification_1:user_1",
};

function makeConfig(values: Record<string, unknown>) {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function makeClient(result: unknown) {
  return {
    emails: {
      send: vi.fn().mockResolvedValue(result),
    },
  } as unknown as ResendClient;
}

describe("ResendMailerService", () => {
  it("skips provider calls when email sending is disabled", async () => {
    const client = makeClient({ data: { id: "msg_1" }, error: null });
    const service = new ResendMailerService(
      makeConfig({ EMAIL_ENABLED: false }),
      client,
    );

    await expect(service.sendDelivery(delivery, rendered)).resolves.toEqual({
      skipped: true,
    });
    expect(client.emails.send).not.toHaveBeenCalled();
  });

  it("sends through Resend with idempotency and tags when enabled", async () => {
    const client = makeClient({ data: { id: "msg_1" }, error: null });
    const service = new ResendMailerService(
      makeConfig({
        EMAIL_ENABLED: true,
        EMAIL_FROM: "Semblia <notifications@semblia.com>",
        EMAIL_REPLY_TO: "support@semblia.com",
      }),
      client,
    );

    await expect(service.sendDelivery(delivery, rendered)).resolves.toEqual({
      skipped: false,
      providerMessageId: "msg_1",
    });
    expect(client.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Semblia <notifications@semblia.com>",
        to: ["ada@example.com"],
        replyTo: "support@semblia.com",
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: expect.arrayContaining([
          { name: "template", value: "NOTIFICATION" },
          { name: "delivery_id", value: "email_1" },
          { name: "project_id", value: "project_1" },
          { name: "user_id", value: "user_1" },
        ]),
      }),
      { idempotencyKey: "notification:notification_1:user_1" },
    );
  });

  it("classifies validation failures as permanent provider errors", async () => {
    const client = makeClient({
      data: null,
      error: {
        message: "Invalid recipient",
        statusCode: 422,
      },
    });
    const service = new ResendMailerService(
      makeConfig({
        EMAIL_ENABLED: true,
        EMAIL_FROM: "Semblia <notifications@semblia.com>",
      }),
      client,
    );

    await expect(service.sendDelivery(delivery, rendered)).resolves.toEqual({
      skipped: false,
      error: expect.objectContaining({
        message: "Invalid recipient",
        retryable: false,
        statusCode: 422,
      }),
    });
  });
});
