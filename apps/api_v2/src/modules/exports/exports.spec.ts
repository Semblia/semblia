import { RequestMethod } from "@nestjs/common";
import { ExportDestinationProvider } from "@workspace/database/prisma";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { OutboundWebhooksService } from "../outbound-webhooks/outbound-webhooks.service.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import { ExportsController } from "./exports.controller.js";
import { ExportsService } from "./exports.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

const mockTransaction = vi.fn();
const mockDestinationFindFirst = vi.fn();
const mockDestinationCreate = vi.fn();
const mockDeliveryCreate = vi.fn();
const mockDeliveryFindFirst = vi.fn();
const mockDeliveryFindMany = vi.fn();
const mockDeliveryCount = vi.fn();
const mockDeliveryUpdate = vi.fn();
const mockSubmissionFindMany = vi.fn();
const mockMediaAssetCreate = vi.fn();
const mockAuditCreate = vi.fn();
const mockQueueAdd = vi.fn();
const mockEnqueueEvent = vi.fn();
const mockS3PutObject = vi.fn();
const mockCreateForProjectManagers = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    exportDestination: {
      findFirst: mockDestinationFindFirst,
      create: mockDestinationCreate,
    },
    exportDelivery: {
      create: mockDeliveryCreate,
      findFirst: mockDeliveryFindFirst,
      findMany: mockDeliveryFindMany,
      count: mockDeliveryCount,
      update: mockDeliveryUpdate,
    },
    collectionFormSubmission: {
      findMany: mockSubmissionFindMany,
    },
    mediaAsset: {
      create: mockMediaAssetCreate,
    },
    projectActionAudit: {
      create: mockAuditCreate,
    },
  },
} as unknown as PrismaService;

const queueMock = {
  add: mockQueueAdd,
};

const outboundWebhooksMock = {
  enqueueEvent: mockEnqueueEvent,
} as unknown as OutboundWebhooksService;

const s3ServiceMock = {
  bucketName: "test-bucket",
  putObject: mockS3PutObject,
  presignGet: vi.fn(),
};

const notificationsServiceMock = {
  createForProjectManagers: mockCreateForProjectManagers,
} as unknown as NotificationsService;

const actor = {
  actorType: "agent_key" as const,
  credentialId: "key_1",
  projectId: "project_1",
  clerkOrgPermissions: [],
  scopes: ["exports:write"],
};

function makeDestination(overrides: Record<string, unknown> = {}) {
  return {
    id: "dest_1",
    projectId: "project_1",
    provider: ExportDestinationProvider.CSV,
    name: "CSV export",
    config: { format: "submission_csv" },
    status: "ACTIVE",
    createdAt: new Date("2026-05-08T12:00:00.000Z"),
    updatedAt: new Date("2026-05-08T12:00:00.000Z"),
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "expdel_123",
    projectId: "project_1",
    destinationId: "dest_1",
    ruleId: null,
    eventType: "export.csv_requested",
    payload: { format: "submission_csv" },
    status: "PENDING",
    attempts: 0,
    error: null,
    artifactAssetId: null,
    completedAt: null,
    createdAt: new Date("2026-05-08T12:00:00.000Z"),
    updatedAt: new Date("2026-05-08T12:00:00.000Z"),
    destination: makeDestination(),
    ...overrides,
  };
}

describe("ExportsController", () => {
  it("declares project-scoped async export routes with integration capabilities", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ExportsController)).toBe(
      "projects/:slug/exports",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ExportsController)).toEqual([
      CapabilityGuard,
    ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ExportsController.prototype.createCsvExport,
      ),
    ).toEqual([Capability.MANAGE_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ExportsController.prototype.listDeliveries,
      ),
    ).toEqual([Capability.VIEW_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ExportsController.prototype.downloadDelivery,
      ),
    ).toBe("deliveries/:deliveryId/download");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        ExportsController.prototype.createCsvExport,
      ),
    ).toBe(RequestMethod.POST);
  });
});

describe("ExportsService", () => {
  let service: ExportsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) =>
      callback(prismaMock.client),
    );
    mockQueueAdd.mockResolvedValue({ id: "job_1" });
    service = new ExportsService(
      prismaMock,
      queueMock as never,
      new ProjectActionAuditService(prismaMock),
      outboundWebhooksMock,
      s3ServiceMock as never,
      undefined,
      notificationsServiceMock,
    );
  });

  it("creates a pending CSV delivery and enqueues an async export job", async () => {
    mockDestinationFindFirst.mockResolvedValue(null);
    mockDestinationCreate.mockResolvedValue(makeDestination());
    mockDeliveryCreate.mockImplementation(async ({ data }) =>
      makeDelivery({
        id: data.id,
        projectId: data.projectId,
        destinationId: data.destinationId,
        eventType: data.eventType,
        payload: data.payload,
      }),
    );

    const queued = await service.createCsvExport(
      "project_1",
      { filename: "testimonials.csv" },
      actor,
    );

    expect(queued.status).toBe("PENDING");
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "csv",
      { deliveryId: expect.stringMatching(/^expdel_/) },
      expect.objectContaining({ attempts: 3 }),
    );
    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        actorType: "agent_key",
        credentialId: "key_1",
        action: "export.csv_requested",
        targetType: "export_delivery",
      }),
    });
  });

  it("builds completed CSV artifacts from display-safe submission fields only", async () => {
    mockDeliveryFindFirst.mockResolvedValue(makeDelivery());
    mockDeliveryUpdate
      .mockResolvedValueOnce(
        makeDelivery({ status: "DELIVERING", attempts: 1 }),
      )
      .mockImplementationOnce(async ({ data }) =>
        makeDelivery({
          status: data.status,
          artifactAssetId: data.artifactAssetId,
          completedAt: data.completedAt,
        }),
      );
    mockMediaAssetCreate.mockImplementation(async ({ data }) => ({
      id: "media_1",
      storageKey: data.storageKey,
    }));
    mockS3PutObject.mockResolvedValue(undefined);
    mockSubmissionFindMany.mockResolvedValue([
      {
        id: "sub_1",
        answers: {
          authorName: "Ava",
          authorRole: "Founder",
          authorCompany: "Acme, Inc.",
          content: 'Loved "Semblia"',
          source: "public",
          sourceUrl: "https://example.com/source",
        },
        ratingValue: 5,
        moderationStatus: "APPROVED",
        createdAt: new Date("2026-05-08T12:00:00.000Z"),
        updatedAt: new Date("2026-05-08T12:30:00.000Z"),
      },
    ]);

    await service.processCsvExport("expdel_123");
    const csv = mockS3PutObject.mock.calls[0]?.[1] as string;

    expect(csv).toContain(
      "submission_id,author_name,author_role,author_company,content,rating,is_approved,moderation_status,source,source_url,created_at,updated_at",
    );
    expect(csv).toContain(
      'sub_1,Ava,Founder,"Acme, Inc.","Loved ""Semblia""",5,true,APPROVED,public,https://example.com/source',
    );
    expect(csv).not.toContain("authorEmail");
    expect(csv).not.toContain("ipAddress");
    expect(csv).not.toContain("privateMetadata");
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "EXPORT_DELIVERY_READY",
        link: "/projects",
        metadata: expect.objectContaining({
          projectId: "project_1",
          deliveryId: "expdel_123",
          artifactAssetId: "media_1",
        }),
      }),
    );
  });

  it("marks failed CSV jobs and emits the export.delivery_failed event", async () => {
    mockDeliveryFindFirst.mockResolvedValue(makeDelivery());
    mockDeliveryUpdate
      .mockResolvedValueOnce(
        makeDelivery({ status: "DELIVERING", attempts: 1 }),
      )
      .mockResolvedValueOnce(
        makeDelivery({ status: "FAILED", error: "database unavailable" }),
      );
    mockSubmissionFindMany.mockRejectedValue(
      new Error("database unavailable"),
    );
    mockEnqueueEvent.mockResolvedValue([]);

    await expect(service.processCsvExport("expdel_123")).rejects.toThrow(
      "database unavailable",
    );

    expect(mockDeliveryUpdate).toHaveBeenLastCalledWith({
      where: { id: "expdel_123" },
      data: expect.objectContaining({
        status: "FAILED",
        error: "database unavailable",
      }),
      select: expect.any(Object),
    });
    expect(mockEnqueueEvent).toHaveBeenCalledWith("project_1", {
      eventType: "export.delivery_failed",
      payload: expect.objectContaining({
        deliveryId: "expdel_123",
        error: "database unavailable",
      }),
    });
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "EXPORT_DELIVERY_FAILED",
        metadata: expect.objectContaining({
          deliveryId: "expdel_123",
          error: "database unavailable",
        }),
      }),
    );
  });
});
