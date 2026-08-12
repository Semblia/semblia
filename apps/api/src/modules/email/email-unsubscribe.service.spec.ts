import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service.js";
import { EmailUnsubscribeController } from "./email-unsubscribe.controller.js";
import { EmailUnsubscribeService } from "./email-unsubscribe.service.js";

function makeConfig() {
  const values: Record<string, string> = {
    EMAIL_UNSUBSCRIBE_SECRET: "unit-test-secret",
    API_PUBLIC_URL: "https://api.semblia.com",
  };
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function makeHarness() {
  const emailDelivery = {
    findUnique: vi.fn().mockResolvedValue({
      id: "delivery_1",
      recipientEmail: "Ada@Example.com",
      projectId: "project_1",
    }),
  };
  const emailSuppression = {
    upsert: vi.fn().mockResolvedValue({
      id: "suppression_1",
      emailHash: "hash",
      reason: "RECIPIENT_SUPPRESSED",
      sourceDeliveryId: "delivery_1",
    }),
  };
  const prisma = {
    client: { emailDelivery, emailSuppression },
  } as unknown as PrismaService;
  const service = new EmailUnsubscribeService(prisma, makeConfig());
  return {
    service,
    controller: new EmailUnsubscribeController(service),
    emailDelivery,
    emailSuppression,
  };
}

function makeResponse() {
  const response = {
    type: vi.fn(),
    send: vi.fn(),
  };
  response.type.mockReturnValue(response);
  response.send.mockReturnValue(response);
  return response;
}

describe("public email unsubscribe", () => {
  it("GET renders confirmation without creating a suppression", async () => {
    const { service, controller, emailSuppression } = makeHarness();
    const token = service.tokenForDelivery("delivery_1");
    const response = makeResponse();

    await controller.confirm({ token }, response as never);
    expect(response.type).toHaveBeenCalledWith("text/html; charset=utf-8");
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('<form method="post"'),
    );
    expect(emailSuppression.upsert).not.toHaveBeenCalled();
  });

  it("POST suppresses the normalized recipient", async () => {
    const { service, controller, emailSuppression } = makeHarness();
    const token = service.tokenForDelivery("delivery_1");
    const response = makeResponse();

    await controller.unsubscribe({ token }, response as never);
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining("You have been unsubscribed"),
    );
    expect(emailSuppression.upsert).toHaveBeenCalledWith({
      where: {
        projectId_emailHash: {
          projectId: "project_1",
          emailHash:
            "b5fc85e55755f9e0d030a10ab4429b6b2944855f9a0d60077fe832becbc41d72",
        },
      },
      create: {
        projectId: "project_1",
        emailHash:
          "b5fc85e55755f9e0d030a10ab4429b6b2944855f9a0d60077fe832becbc41d72",
        reason: "RECIPIENT_SUPPRESSED",
        sourceDeliveryId: "delivery_1",
      },
      update: {
        reason: "RECIPIENT_SUPPRESSED",
        sourceDeliveryId: "delivery_1",
      },
    });
  });

  it("refuses a delivery with no project to scope the suppression to", async () => {
    const { service, emailDelivery, emailSuppression } = makeHarness();
    emailDelivery.findUnique.mockResolvedValueOnce({
      id: "delivery_1",
      recipientEmail: "Ada@Example.com",
      projectId: null,
    });
    const token = service.tokenForDelivery("delivery_1");

    await expect(service.unsubscribe(token)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(emailSuppression.upsert).not.toHaveBeenCalled();
  });

  it("rejects a tampered token before looking up a delivery", async () => {
    const { service, emailDelivery } = makeHarness();
    const token = `${service.tokenForDelivery("delivery_1")}tampered`;

    await expect(service.inspect(token)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(emailDelivery.findUnique).not.toHaveBeenCalled();
  });

  it("replays POST idempotently through the unique email hash", async () => {
    const { service, emailSuppression } = makeHarness();
    const token = service.tokenForDelivery("delivery_1");

    await service.unsubscribe(token);
    await service.unsubscribe(token);

    expect(emailSuppression.upsert).toHaveBeenCalledTimes(2);
    expect(emailSuppression.upsert.mock.calls[0]?.[0].where).toEqual(
      emailSuppression.upsert.mock.calls[1]?.[0].where,
    );
  });
});
