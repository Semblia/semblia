import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  EmailDeliveryStatus,
  EmailTemplateKey,
} from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import type { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { EmailDeliveryService } from "../email/email-delivery.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import {
  FORM_REQUEST_DAILY_RECIPIENT_LIMIT,
  FormRequestsService,
} from "./form-requests.service.js";

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

type CreateManyArgs = { data: Array<Record<string, unknown>> };

function makeService(overrides: Record<string, unknown> = {}) {
  // Captures what the two createMany statements wrote so the read-back can
  // return the same committed shape the real database would.
  let writtenRecipients: Array<Record<string, unknown>> = [];
  let writtenDeliveries: Array<Record<string, unknown>> = [];

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
      create: vi.fn().mockResolvedValue({ id: "request_1" }),
      findUniqueOrThrow: vi.fn(async () => ({
        id: "request_1",
        projectId: "project_1",
        formId: "form_1",
        note: "Please share the launch story.",
        createdByUserId: "user_1",
        createdAt: now,
        form: { name: "Customer story", slug: "customer-story" },
        recipients: writtenRecipients.map((row) => ({
          id: row.id,
          email: row.email,
          submittedAt: null,
          submittedResponseId: null,
          createdAt: now,
          delivery: {
            status: EmailDeliveryStatus.PENDING,
            suppressionReason: null,
            sentAt: null,
          },
        })),
      })),
      findMany: vi.fn(),
    },
    formRequestRecipient: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn(async (args: CreateManyArgs) => {
        writtenRecipients = args.data;
        return { count: args.data.length };
      }),
    },
    emailDelivery: {
      createMany: vi.fn(async (args: CreateManyArgs) => {
        writtenDeliveries = args.data;
        return { count: args.data.length };
      }),
    },
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
    recordWith: vi.fn().mockResolvedValue({}),
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
    written: () => ({ writtenRecipients, writtenDeliveries }),
  };
}

describe("FormRequestsService", () => {
  it("creates recipient and delivery rows atomically with safe idempotency keys", async () => {
    const { service, client, emailDelivery, actionAudit, written } =
      makeService();

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
    // Constant statement count: one createMany each, never per-recipient.
    expect(client.emailDelivery.createMany).toHaveBeenCalledTimes(1);
    expect(client.formRequestRecipient.createMany).toHaveBeenCalledTimes(1);

    const { writtenRecipients, writtenDeliveries } = written();
    expect(writtenDeliveries).toHaveLength(2);
    expect(writtenRecipients).toHaveLength(2);
    for (const [i, data] of writtenDeliveries.entries()) {
      expect(data.template).toBe(EmailTemplateKey.FORM_REQUEST);
      expect(data.projectId).toBe("project_1");
      const key = data.idempotencyKey as string;
      expect(key).toBe(`form-request-${writtenRecipients[i]?.id}`);
      expect(key).not.toContain(":");
      expect(key.length).toBeLessThanOrEqual(255);
      expect(data.payload).toMatchObject({
        ownerEmail: "owner@acme.test",
        formUrl: "https://acme.forms.semblia.com/f/customer-story",
      });
      // The FK pairing survives the batch write.
      expect(writtenRecipients[i]?.emailDeliveryId).toBe(data.id);
    }
    expect(emailDelivery.enqueueDelivery).toHaveBeenCalledTimes(2);
    // Audit rides inside the transaction (recordWith on the tx client), so a
    // failure rolls the compose back before anything is enqueued.
    expect(actionAudit.recordWith).toHaveBeenCalledWith(
      client,
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
        expect.objectContaining({
          email: "ada@example.com",
          delivery: expect.objectContaining({ status: "PENDING" }),
        }),
        expect.objectContaining({
          email: "grace@example.com",
          delivery: expect.objectContaining({ status: "PENDING" }),
        }),
      ],
    });
    expect(Object.keys(result)).not.toEqual(["data"]);
  });

  it("rolls the whole compose back when the audit write fails — nothing is enqueued", async () => {
    const { service, emailDelivery, actionAudit } = makeService();
    (
      actionAudit.recordWith as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("audit insert failed"));
    // A real $transaction propagates the callback's rejection and rolls back.
    await expect(
      service.create(
        { formId: "form_1", emails: ["ada@example.com"], note: null },
        { projectAccess: { projectId: "project_1" } },
        null,
      ),
    ).rejects.toThrow("audit insert failed");
    expect(emailDelivery.enqueueDelivery).not.toHaveBeenCalled();
  });

  it("409s a compose that would push the project past its daily recipient bound", async () => {
    const { service, client } = makeService();
    client.formRequestRecipient.count.mockResolvedValueOnce(
      FORM_REQUEST_DAILY_RECIPIENT_LIMIT - 1,
    );
    await expect(
      service.create(
        {
          formId: "form_1",
          emails: ["ada@example.com", "grace@example.com"],
          note: null,
        },
        { projectAccess: { projectId: "project_1" } },
        null,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(client.$transaction).not.toHaveBeenCalled();
    // Scoped to this project's rows, not the whole table.
    expect(client.formRequestRecipient.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: "project_1" }),
      }),
    );
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
