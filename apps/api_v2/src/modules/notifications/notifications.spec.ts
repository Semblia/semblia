import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemberRole } from "@workspace/database/prisma";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { EmailDeliveryService } from "../email/email-delivery.service.js";

const PATH_METADATA = "path";
const GUARDS_METADATA = "__guards__";

const mockNotificationCount = vi.fn();
const mockNotificationFindMany = vi.fn();
const mockNotificationFindFirst = vi.fn();
const mockNotificationUpdate = vi.fn();
const mockNotificationUpdateMany = vi.fn();
const mockNotificationCreate = vi.fn();
const mockNotificationCreateMany = vi.fn();
const mockPreferencesFindMany = vi.fn();
const mockPreferencesFindUnique = vi.fn();
const mockPreferencesUpsert = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockUserFindMany = vi.fn();
const mockCreateNotificationDeliveryWith = vi.fn();

const prismaMock = {
  client: {
    notification: {
      count: mockNotificationCount,
      findMany: mockNotificationFindMany,
      findFirst: mockNotificationFindFirst,
      create: mockNotificationCreate,
      update: mockNotificationUpdate,
      updateMany: mockNotificationUpdateMany,
      createMany: mockNotificationCreateMany,
    },
    notificationPreferences: {
      findMany: mockPreferencesFindMany,
      findUnique: mockPreferencesFindUnique,
      upsert: mockPreferencesUpsert,
    },
    project: {
      findUnique: mockProjectFindUnique,
    },
    user: {
      findMany: mockUserFindMany,
    },
  },
} as unknown as PrismaService;

const emailDeliveryServiceMock = {
  createNotificationDeliveryWith: mockCreateNotificationDeliveryWith,
} as unknown as EmailDeliveryService;

describe("NotificationsController", () => {
  it("declares the authenticated notifications route family", () => {
    expect(Reflect.getMetadata(PATH_METADATA, NotificationsController)).toBe(
      "notifications",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, NotificationsController)).toEqual(
      [UserActorGuard],
    );
  });
});

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService(prismaMock);
    vi.clearAllMocks();
  });

  it("lists only the current user's notifications with filters", async () => {
    mockNotificationCount.mockResolvedValue(1);
    mockNotificationFindMany.mockResolvedValue([
      notificationRecord({
        type: "EXPORT_DELIVERY_FAILED",
        metadata: { deliveryId: "del_1" },
      }),
    ]);

    await expect(
      service.list("user_1", {
        page: 2,
        pageSize: 5,
        isRead: false,
        type: "EXPORT_DELIVERY_FAILED",
      }),
    ).resolves.toMatchObject({
      total: 1,
      page: 2,
      pageSize: 5,
      items: [
        {
          id: "notif_1",
          userId: "user_1",
          type: "EXPORT_DELIVERY_FAILED",
          metadata: { deliveryId: "del_1" },
          createdAt: "2026-05-10T00:00:00.000Z",
        },
      ],
    });

    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user_1",
          isRead: false,
          type: "EXPORT_DELIVERY_FAILED",
        },
        skip: 5,
        take: 5,
      }),
    );
  });

  it("marks a notification read only when it belongs to the current user", async () => {
    mockNotificationFindFirst.mockResolvedValue({ id: "notif_1" });
    mockNotificationUpdate.mockResolvedValue(
      notificationRecord({ isRead: true }),
    );

    await expect(service.markRead("user_1", "notif_1")).resolves.toMatchObject({
      id: "notif_1",
      isRead: true,
    });

    expect(mockNotificationFindFirst).toHaveBeenCalledWith({
      where: {
        id: "notif_1",
        userId: "user_1",
      },
      select: { id: true },
    });
  });

  it("returns default preferences without creating a row", async () => {
    mockPreferencesFindUnique.mockResolvedValue(null);

    await expect(service.getPreferences("user_1")).resolves.toEqual({
      userId: "user_1",
      emailEnabled: true,
      typePreferences: {},
      updatedAt: null,
    });
  });

  it("updates notification preferences by merging type preferences", async () => {
    mockPreferencesFindUnique.mockResolvedValue({
      userId: "user_1",
      emailEnabled: true,
      typePreferences: {
        SECURITY_ALERT: { email: true, inApp: true },
      },
      updatedAt: new Date("2026-05-09T00:00:00.000Z"),
    });
    mockPreferencesUpsert.mockResolvedValue({
      userId: "user_1",
      emailEnabled: false,
      typePreferences: {
        SECURITY_ALERT: { email: true, inApp: true },
        AGENT_ACTION_CREATED: { email: false, inApp: true },
      },
      updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    });

    await expect(
      service.updatePreferences("user_1", {
        emailEnabled: false,
        typePreferences: {
          AGENT_ACTION_CREATED: { email: false, inApp: true },
        },
      }),
    ).resolves.toMatchObject({
      emailEnabled: false,
      typePreferences: {
        SECURITY_ALERT: { email: true, inApp: true },
        AGENT_ACTION_CREATED: { email: false, inApp: true },
      },
    });
  });

  it("creates in-app notifications only for users whose preferences allow the type", async () => {
    mockPreferencesFindMany.mockResolvedValue([
      {
        userId: "user_disabled",
        typePreferences: {
          SUBMISSION_CREATED: { email: true, inApp: false },
        },
      },
    ]);
    mockNotificationCreateMany.mockResolvedValue({ count: 2 });

    await expect(
      service.createForUsers(["user_1", "user_1", "user_disabled", "user_2"], {
        type: "SUBMISSION_CREATED",
        title: "New submission",
        message: "Ada submitted a response.",
        link: "/projects/acme/submissions/submission_1",
        metadata: { projectId: "project_1", submissionId: "submission_1" },
      }),
    ).resolves.toEqual({ count: 2 });

    expect(mockNotificationCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: "user_1" }),
        expect.objectContaining({ userId: "user_2" }),
      ],
    });
  });

  it("creates email delivery rows for created notifications when email delivery is available", async () => {
    service = new NotificationsService(prismaMock, emailDeliveryServiceMock);
    mockPreferencesFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([
      {
        id: "user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        notificationPreferences: {
          emailEnabled: true,
          typePreferences: {},
        },
      },
    ]);
    mockNotificationCreate.mockResolvedValue(
      notificationRecord({ id: "notif_1", userId: "user_1" }),
    );
    mockCreateNotificationDeliveryWith.mockResolvedValue({ id: "email_1" });

    await expect(
      service.createForUsers(["user_1"], {
        type: "SUBMISSION_CREATED",
        title: "New submission",
        message: "Ada submitted a response.",
        link: "/projects/acme/submissions/submission_1",
        metadata: { projectId: "project_1", submissionId: "submission_1" },
      }),
    ).resolves.toEqual({ count: 1 });

    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user_1" }),
      select: expect.any(Object),
    });
    expect(mockCreateNotificationDeliveryWith).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: "notif_1", userId: "user_1" }),
      expect.objectContaining({
        userId: "user_1",
        email: "ada@example.com",
        name: "Ada Lovelace",
        emailEnabled: true,
      }),
    );
  });

  it("notifies only project members with the requested capability", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      userId: "owner_1",
      members: [
        { userId: "editor_1", role: MemberRole.EDITOR },
        { userId: "viewer_1", role: MemberRole.VIEWER },
      ],
    });
    mockPreferencesFindMany.mockResolvedValue([]);
    mockNotificationCreateMany.mockResolvedValue({ count: 2 });

    await service.createForProjectReviewers("project_1", {
      type: "SUBMISSION_CREATED",
      title: "New response",
      message: "A new form response is ready for review.",
      link: "/projects/acme/submissions/submission_1",
      metadata: { projectId: "project_1", submissionId: "submission_1" },
    });

    expect(mockNotificationCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: "owner_1" }),
        expect.objectContaining({ userId: "editor_1" }),
      ],
    });
  });
});

function notificationRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "notif_1",
    userId: "user_1",
    type: "SECURITY_ALERT",
    title: "Security alert",
    message: "A credential changed.",
    link: null,
    metadata: null,
    isRead: false,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    ...overrides,
  };
}
