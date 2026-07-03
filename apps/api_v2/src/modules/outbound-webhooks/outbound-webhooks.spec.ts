import { RequestMethod } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OutboundWebhookStatus } from "@workspace/database/prisma";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { encryptSecret } from "../../common/crypto/secret-cipher.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { OUTBOUND_WEBHOOK_EVENTS } from "./outbound-webhook-events.js";
import { OutboundWebhooksController } from "./outbound-webhooks.controller.js";
import type { OutboundWebhookDispatcher } from "./outbound-webhook-dispatcher.js";
import { OutboundWebhooksService } from "./outbound-webhooks.service.js";
import { outboundWebhookUrlSchema } from "./outbound-webhooks.dto.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

const encryptionKey = Buffer.from("0123456789abcdef0123456789abcdef");
const encryptionKeyBase64 = encryptionKey.toString("base64");

const mockTransaction = vi.fn();
const mockEndpointCreate = vi.fn();
const mockEndpointFindMany = vi.fn();
const mockEndpointFindFirst = vi.fn();
const mockEndpointUpdate = vi.fn();
const mockDeliveryCreate = vi.fn();
const mockDeliveryFindFirst = vi.fn();
const mockDeliveryFindMany = vi.fn();
const mockDeliveryCount = vi.fn();
const mockDeliveryUpdate = vi.fn();
const mockAuditCreate = vi.fn();
const mockQueueAdd = vi.fn();
const mockDispatcherSend = vi.fn();
const mockCreateForProjectManagers = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    outboundWebhookEndpoint: {
      create: mockEndpointCreate,
      findMany: mockEndpointFindMany,
      findFirst: mockEndpointFindFirst,
      update: mockEndpointUpdate,
    },
    outboundWebhookDelivery: {
      create: mockDeliveryCreate,
      findFirst: mockDeliveryFindFirst,
      findMany: mockDeliveryFindMany,
      count: mockDeliveryCount,
      update: mockDeliveryUpdate,
    },
    projectActionAudit: {
      create: mockAuditCreate,
    },
  },
} as unknown as PrismaService;

const configServiceMock = {
  get: vi.fn(() => encryptionKeyBase64),
} as unknown as ConfigService;

const queueMock = {
  add: mockQueueAdd,
};

const dispatcherMock = {
  send: mockDispatcherSend,
};

const notificationsServiceMock = {
  createForProjectManagers: mockCreateForProjectManagers,
} as unknown as NotificationsService;

const actor = {
  actorType: "user" as const,
  userId: "user_1",
  clerkOrgPermissions: [],
  scopes: [],
};

function makeEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: "owhe_1",
    projectId: "project_1",
    name: "Production webhook",
    url: "https://example.com/semblia",
    signingSecretEncrypted: encryptSecret("whsec_test", encryptionKey),
    signingSecretHash: "hash",
    subscribedEvents: ["submission.moderated"],
    status: OutboundWebhookStatus.ACTIVE,
    lastSuccessAt: null,
    lastFailureAt: null,
    createdAt: new Date("2026-05-08T12:00:00.000Z"),
    updatedAt: new Date("2026-05-08T12:00:00.000Z"),
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "del_123",
    endpointId: "owhe_1",
    projectId: "project_1",
    eventType: "submission.moderated",
    payload: { submissionId: "sub_1" },
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: null,
    responseStatus: null,
    responseBodySnippet: null,
    error: null,
    createdAt: new Date("2026-05-08T12:00:00.000Z"),
    updatedAt: new Date("2026-05-08T12:00:00.000Z"),
    endpoint: makeEndpoint(),
    ...overrides,
  };
}

describe("OutboundWebhooksController", () => {
  it("declares project-scoped outbound webhook routes with integration capabilities", () => {
    expect(Reflect.getMetadata(PATH_METADATA, OutboundWebhooksController)).toBe(
      "projects/:slug/outbound-webhooks",
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OutboundWebhooksController),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        OutboundWebhooksController.prototype.listEndpoints,
      ),
    ).toEqual([Capability.VIEW_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        OutboundWebhooksController.prototype.createEndpoint,
      ),
    ).toEqual([Capability.MANAGE_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        OutboundWebhooksController.prototype.retryDelivery,
      ),
    ).toEqual([Capability.MANAGE_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        OutboundWebhooksController.prototype.listDeliveries,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OutboundWebhooksController.prototype.retryDelivery,
      ),
    ).toBe("deliveries/:deliveryId/retry");
  });
});

describe("outboundWebhookUrlSchema", () => {
  it("allows public HTTPS webhook endpoints", () => {
    expect(
      outboundWebhookUrlSchema.safeParse("https://hooks.example/semblia")
        .success,
    ).toBe(true);
  });

  it("rejects blocked host literals and cloud metadata names", () => {
    expect(
      outboundWebhookUrlSchema.safeParse("https://169.254.169.254/hook")
        .success,
    ).toBe(false);
    expect(
      outboundWebhookUrlSchema.safeParse("https://[::ffff:7f00:1]/hook")
        .success,
    ).toBe(false);
    expect(
      outboundWebhookUrlSchema.safeParse(
        "https://metadata.google.internal/hook",
      ).success,
    ).toBe(false);
  });

  it("rejects credentials, wildcards, and non-HTTPS webhook endpoints", () => {
    expect(
      outboundWebhookUrlSchema.safeParse("https://user:pass@example.com/hook")
        .success,
    ).toBe(false);
    expect(
      outboundWebhookUrlSchema.safeParse("https://*.example.com/hook").success,
    ).toBe(false);
    expect(
      outboundWebhookUrlSchema.safeParse("http://hooks.example/hook").success,
    ).toBe(false);
  });
});

describe("OutboundWebhooksService", () => {
  let service: OutboundWebhooksService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) =>
      callback(prismaMock.client),
    );
    mockQueueAdd.mockResolvedValue({ id: "job_1" });
    service = new OutboundWebhooksService(
      prismaMock,
      configServiceMock,
      queueMock as never,
      dispatcherMock as unknown as OutboundWebhookDispatcher,
      new ProjectActionAuditService(prismaMock),
      notificationsServiceMock,
    );
  });

  it("uses an explicit launch event catalogue", () => {
    expect(OUTBOUND_WEBHOOK_EVENTS).toEqual([
      "submission.created",
      "submission.moderated",
      "export.delivery_failed",
      "agent.action_created",
    ]);
  });

  it("creates an endpoint with an encrypted one-time secret and audit row", async () => {
    mockEndpointCreate.mockImplementation(async ({ data }) =>
      makeEndpoint({
        name: data.name,
        url: data.url,
        signingSecretEncrypted: data.signingSecretEncrypted,
        signingSecretHash: data.signingSecretHash,
        subscribedEvents: data.subscribedEvents,
      }),
    );

    const created = await service.createEndpoint(
      "project_1",
      {
        name: "Production webhook",
        url: "https://example.com/semblia",
        subscribedEvents: ["submission.moderated"],
      },
      actor,
    );

    expect(created.signingSecret).toMatch(/^whsec_/);
    expect(mockEndpointCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "Production webhook",
        url: "https://example.com/semblia",
        signingSecretEncrypted: expect.any(String),
        signingSecretHash: expect.any(String),
        subscribedEvents: ["submission.moderated"],
      }),
      select: expect.any(Object),
    });
    expect(
      mockEndpointCreate.mock.calls[0]?.[0]?.data.signingSecretEncrypted,
    ).not.toContain(created.signingSecret);
    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        actorType: "user",
        actorId: "user_1",
        action: "outbound_webhook.created",
        targetType: "outbound_webhook_endpoint",
      }),
    });
  });

  it("queues deliveries only for endpoints subscribed to the event", async () => {
    mockEndpointFindMany.mockResolvedValue([makeEndpoint()]);
    mockDeliveryCreate.mockImplementation(async ({ data }) =>
      makeDelivery({
        id: data.id,
        endpointId: data.endpointId,
        projectId: data.projectId,
        eventType: data.eventType,
        payload: data.payload,
      }),
    );

    const queued = await service.enqueueEvent("project_1", {
      eventType: "submission.moderated",
      payload: { submissionId: "sub_1" },
    });

    expect(queued).toHaveLength(1);
    expect(mockEndpointFindMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: OutboundWebhookStatus.ACTIVE,
        subscribedEvents: { has: "submission.moderated" },
      },
      select: expect.any(Object),
    });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "deliver",
      { deliveryId: expect.stringMatching(/^del_/) },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("marks a delivery succeeded after dispatching a signed JSON payload", async () => {
    const endpoint = makeEndpoint();
    const created = await service.createEndpoint(
      "project_1",
      {
        name: endpoint.name,
        url: endpoint.url,
        subscribedEvents: ["submission.moderated"],
      },
      actor,
    );
    const encrypted =
      mockEndpointCreate.mock.calls[0]?.[0]?.data.signingSecretEncrypted;

    mockDeliveryFindFirst.mockResolvedValue(
      makeDelivery({
        endpoint: makeEndpoint({ signingSecretEncrypted: encrypted }),
      }),
    );
    mockDeliveryUpdate
      .mockResolvedValueOnce(
        makeDelivery({ status: "DELIVERING", attempts: 1 }),
      )
      .mockResolvedValueOnce(
        makeDelivery({
          status: "SUCCEEDED",
          attempts: 1,
          responseStatus: 204,
        }),
      );
    mockDispatcherSend.mockResolvedValue({
      status: 204,
      bodySnippet: "",
    });

    await service.processDelivery("del_123");

    expect(mockDispatcherSend).toHaveBeenCalledWith({
      url: "https://example.com/semblia",
      rawBody: JSON.stringify({ submissionId: "sub_1" }),
      headers: expect.objectContaining({
        "X-Semblia-Event": "submission.moderated",
        "X-Semblia-Delivery": "del_123",
        "X-Semblia-Signature": expect.stringMatching(/^v1=/),
      }),
    });
    expect(mockDispatcherSend.mock.calls[0]?.[0]?.headers).not.toContain(
      created.signingSecret,
    );
    expect(mockDeliveryUpdate).toHaveBeenLastCalledWith({
      where: { id: "del_123" },
      data: expect.objectContaining({
        status: "SUCCEEDED",
        responseStatus: 204,
        error: null,
      }),
      select: expect.any(Object),
    });
  });

  it("notifies project managers only when webhook delivery attempts are exhausted", async () => {
    mockDeliveryFindFirst.mockResolvedValue(makeDelivery());
    mockDeliveryUpdate
      .mockResolvedValueOnce(
        makeDelivery({ status: "DELIVERING", attempts: 3 }),
      )
      .mockResolvedValueOnce(
        makeDelivery({
          status: "EXHAUSTED",
          attempts: 3,
          error: "Webhook returned HTTP 500",
        }),
      );
    mockDispatcherSend.mockResolvedValue({
      status: 500,
      bodySnippet: "nope",
    });

    await expect(service.processDelivery("del_123")).rejects.toThrow(
      "Webhook returned HTTP 500",
    );

    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "OUTBOUND_WEBHOOK_DELIVERY_FAILED",
        link: "/projects",
        metadata: expect.objectContaining({
          deliveryId: "del_123",
          endpointId: "owhe_1",
          eventType: "submission.moderated",
        }),
      }),
    );
  });
});
