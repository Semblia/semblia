import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  EmailDeliveryStatus,
  EmailTemplateKey,
} from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import type { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { EmailDeliveryService } from "../email/email-delivery.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { FormRequestsService } from "./form-requests.service.js";

const now = new Date("2026-08-12T10:00:00.000Z");

function form(overrides: Record<string, unknown> = {}) {
  return {
    id: "form_1",
    name: "Customer story",
    slug: "customer-story",
    status: "PUBLISHED",
    currentVersion: 2,
    project: {
      id: "project_1",
      name: "Acme",
      user: { email: "owner@acme.test" },
    },
    ...overrides,
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  const recipientCreate = vi.fn(
    async ({ data }: { data: { email: string } }) => ({
      id: data.email.startsWith("ada") ? "recipient_1" : "recipient_2",
      email: data.email,
      submittedAt: null,
      submittedResponseId: null,
      createdAt: now,
    }),
  );
  const deliveryCreate = vi.fn(
    async ({
      data,
    }: {
      data: Record<string, unknown> & { idempotencyKey: string };
    }) => ({
      id: data.idempotencyKey.replace("form-request-", "delivery_"),
      status: EmailDeliveryStatus.PENDING,
      suppressionReason: null,
      sentAt: null,
    }),
  );
  const client = {
    form: { findFirst: vi.fn().mockResolvedValue(form()) },
    formVersion: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ snapshot: { delivery: "hosted" } }),
    },
    publicSurfaceHost: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ hostname: "acme.forms.semblia.com" }]),
    },
    formRequest: {
      create: vi.fn().mockResolvedValue({
        id: "request_1",
        projectId: "project_1",
        formId: "form_1",
        note: "Please share the launch story.",
        createdByUserId: "user_1",
        createdAt: now,
      }),
      findMany: vi.fn(),
    },
    formRequestRecipient: {
      create: recipientCreate,
      update: vi.fn().mockResolvedValue({}),
    },
    emailDelivery: { create: deliveryCreate },
    $transaction: vi.fn(),
    ...overrides,
  };
  client.$transaction.mockImplementation(
    async (callback: (tx: typeof client) => unknown) => callback(client),
  );
  const emailDelivery = {
    enqueueDelivery: vi.fn().mockResolvedValue({}),
  } as unknown as EmailDeliveryService;
  const actionAudit = {
    record: vi.fn().mockResolvedValue({}),
  } as unknown as ProjectActionAuditService;
  return {
    service: new FormRequestsService(
      { client } as unknown as PrismaService,
      emailDelivery,
      actionAudit,
    ),
    client,
    emailDelivery,
    actionAudit,
  };
}

describe("FormRequestsService", () => {
  it("creates recipient and delivery rows atomically with safe idempotency keys", async () => {
    const { service, client, emailDelivery, actionAudit } = makeService();

    const result = await service.create(
      {
        formId: "form_1",
        emails: ["ada@example.com", "grace@example.com"],
        note: "Please share the launch story.",
      },
      { projectAccess: { projectId: "project_1" } },
      {
        actorType: "user",
        userId: "user_1",
        clerkOrgPermissions: [],
        scopes: [],
      },
    );

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.formRequestRecipient.create).toHaveBeenCalledTimes(2);
    expect(client.emailDelivery.create).toHaveBeenCalledTimes(2);
    expect(client.formRequestRecipient.update).toHaveBeenCalledTimes(2);

    for (const call of client.emailDelivery.create.mock.calls) {
      const data = call[0].data;
      expect(data.template).toBe(EmailTemplateKey.FORM_REQUEST);
      expect(data.projectId).toBe("project_1");
      expect(data.idempotencyKey).toMatch(/^form-request-recipient_[12]$/);
      expect(data.idempotencyKey).not.toContain(":");
      expect(data.idempotencyKey.length).toBeLessThanOrEqual(255);
      expect(data.payload).toMatchObject({
        ownerEmail: "owner@acme.test",
        formUrl: "https://acme.forms.semblia.com/f/customer-story",
      });
    }
    expect(emailDelivery.enqueueDelivery).toHaveBeenCalledTimes(2);
    expect(actionAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        action: "form_request.sent",
        targetType: "form_request",
        targetId: "request_1",
        metadata: { formId: "form_1", recipientCount: 2 },
      }),
    );
    expect(result).toMatchObject({
      id: "request_1",
      formName: "Customer story",
      formSlug: "customer-story",
      recipients: [
        {
          id: "recipient_1",
          email: "ada@example.com",
          delivery: { status: "PENDING" },
        },
        {
          id: "recipient_2",
          email: "grace@example.com",
          delivery: { status: "PENDING" },
        },
      ],
    });
    expect(Object.keys(result)).not.toEqual(["data"]);
  });

  it("rejects a cross-project or unpublished form before opening a transaction", async () => {
    const crossProject = makeService();
    crossProject.client.form.findFirst.mockResolvedValueOnce(null);
    await expect(
      crossProject.service.create(
        { formId: "form_elsewhere", emails: ["ada@example.com"], note: null },
        { projectAccess: { projectId: "project_1" } },
        null,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(crossProject.client.$transaction).not.toHaveBeenCalled();

    const draft = makeService();
    draft.client.form.findFirst.mockResolvedValueOnce(
      form({ status: "DRAFT", currentVersion: null }),
    );
    await expect(
      draft.service.create(
        { formId: "form_1", emails: ["ada@example.com"], note: null },
        { projectAccess: { projectId: "project_1" } },
        null,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(draft.client.$transaction).not.toHaveBeenCalled();
  });

  it("lists newest requests for this project with optional form filtering and live delivery state", async () => {
    const { service, client } = makeService();
    client.formRequest.findMany.mockResolvedValueOnce([
      {
        id: "request_2",
        projectId: "project_1",
        formId: "form_1",
        note: null,
        createdByUserId: null,
        createdAt: now,
        form: { name: "Customer story", slug: "customer-story" },
        recipients: [
          {
            id: "recipient_1",
            email: "ada@example.com",
            submittedAt: now,
            submittedResponseId: "response_1",
            createdAt: now,
            delivery: null,
          },
        ],
      },
    ]);

    await expect(
      service.list(
        { formId: "form_1" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "request_2",
        recipients: [
          expect.objectContaining({
            delivery: null,
            submittedAt: now.toISOString(),
            responseId: "response_1",
          }),
        ],
      }),
    ]);
    expect(client.formRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1", formId: "form_1" },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
