import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  MemberRole,
  Prisma,
  type NotificationType,
} from "@workspace/database/prisma";
import {
  Capability,
  roleHasCapability,
} from "../../common/authz/capabilities.js";
import { paginate } from "../../common/utils/paginate.js";
import { EmailDeliveryService } from "../email/email-delivery.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  NotificationListQueryDto,
  UpdateNotificationPreferencesBodyDto,
} from "./notifications.dto.js";

const NOTIFICATION_SELECT = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  link: true,
  metadata: true,
  isRead: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

const NOTIFICATION_PREFERENCES_SELECT = {
  userId: true,
  emailEnabled: true,
  typePreferences: true,
  updatedAt: true,
} satisfies Prisma.NotificationPreferencesSelect;

type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof NOTIFICATION_SELECT;
}>;

type NotificationPreferencesRecord = Prisma.NotificationPreferencesGetPayload<{
  select: typeof NOTIFICATION_PREFERENCES_SELECT;
}>;

export type CreateNotificationInput = {
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
};

type NotificationWriter = Pick<
  Prisma.TransactionClient,
  | "notification"
  | "notificationPreferences"
  | "project"
  | "user"
  | "emailDelivery"
>;

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EmailDeliveryService)
    private readonly emailDeliveryService?: EmailDeliveryService,
  ) {}

  async createForUsers(
    userIds: readonly string[],
    input: CreateNotificationInput,
    writer: NotificationWriter = this.prisma.client,
  ) {
    const recipients = [...new Set(userIds)].filter(Boolean);
    if (recipients.length === 0) {
      return { count: 0 };
    }

    const preferences = await writer.notificationPreferences.findMany({
      where: { userId: { in: recipients } },
      select: {
        userId: true,
        typePreferences: true,
      },
    });
    const disabledInApp = new Set(
      preferences
        .filter((preference) =>
          this.isInAppDisabled(preference.typePreferences, input.type),
        )
        .map((preference) => preference.userId),
    );
    const enabledRecipients = recipients.filter(
      (userId) => !disabledInApp.has(userId),
    );

    if (enabledRecipients.length === 0) {
      return { count: 0 };
    }

    if (!this.emailDeliveryService) {
      return writer.notification.createMany({
        data: enabledRecipients.map((userId) => ({
          userId,
          type: input.type as NotificationType,
          title: input.title,
          message: input.message,
          link: input.link ?? null,
          metadata:
            input.metadata === undefined || input.metadata === null
              ? Prisma.JsonNull
              : (input.metadata as Prisma.InputJsonValue),
        })),
      });
    }

    const users = await writer.user.findMany({
      where: { id: { in: enabledRecipients } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        notificationPreferences: {
          select: {
            emailEnabled: true,
            typePreferences: true,
          },
        },
      },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    const createdNotifications = await Promise.all(
      enabledRecipients.map((userId) =>
        writer.notification.create({
          data: {
            userId,
            type: input.type as NotificationType,
            title: input.title,
            message: input.message,
            link: input.link ?? null,
            metadata:
              input.metadata === undefined || input.metadata === null
                ? Prisma.JsonNull
                : (input.metadata as Prisma.InputJsonValue),
          },
          select: NOTIFICATION_SELECT,
        }),
      ),
    );

    await Promise.all(
      createdNotifications.map((notification) => {
        const user = usersById.get(notification.userId);
        if (!user) return null;

        return this.emailDeliveryService?.createNotificationDeliveryWith(
          writer,
          notification,
          {
            userId: user.id,
            email: user.email,
            name: formatUserName(user.firstName, user.lastName),
            emailEnabled: user.notificationPreferences?.emailEnabled ?? true,
            typePreferences:
              user.notificationPreferences?.typePreferences ?? null,
          },
        );
      }),
    );

    return { count: createdNotifications.length };
  }

  createForProjectReviewers(
    projectId: string,
    input: CreateNotificationInput,
    options: { excludeUserIds?: readonly string[] } = {},
    writer: NotificationWriter = this.prisma.client,
  ) {
    return this.createForProjectCapability(
      projectId,
      Capability.REVIEW_RESPONSES,
      input,
      options,
      writer,
    );
  }

  createForProjectManagers(
    projectId: string,
    input: CreateNotificationInput,
    options: { excludeUserIds?: readonly string[] } = {},
    writer: NotificationWriter = this.prisma.client,
  ) {
    return this.createForProjectCapability(
      projectId,
      Capability.MANAGE_PROJECT,
      input,
      options,
      writer,
    );
  }

  async list(userId: string, query: NotificationListQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.type ? { type: query.type as NotificationType } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [total, notifications] = await Promise.all([
      this.prisma.client.notification.count({ where }),
      this.prisma.client.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: NOTIFICATION_SELECT,
      }),
    ]);

    return paginate({
      data: notifications.map((notification) =>
        this.toNotificationDto(notification),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.client.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.prisma.client.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Notification not found");
    }

    const notification = await this.prisma.client.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      select: NOTIFICATION_SELECT,
    });

    return this.toNotificationDto(notification);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.client.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  async getPreferences(userId: string) {
    const preferences =
      await this.prisma.client.notificationPreferences.findUnique({
        where: { userId },
        select: NOTIFICATION_PREFERENCES_SELECT,
      });

    return this.toPreferencesDto(preferences ?? null, userId);
  }

  async updatePreferences(
    userId: string,
    body: UpdateNotificationPreferencesBodyDto,
  ) {
    const existing = await this.getPreferences(userId);
    const nextTypePreferences = {
      ...existing.typePreferences,
      ...(body.typePreferences ?? {}),
    };

    const preferences = await this.prisma.client.notificationPreferences.upsert(
      {
        where: { userId },
        update: {
          ...(body.emailEnabled !== undefined
            ? { emailEnabled: body.emailEnabled }
            : {}),
          typePreferences: nextTypePreferences,
        },
        create: {
          userId,
          emailEnabled: body.emailEnabled ?? true,
          typePreferences: nextTypePreferences,
        },
        select: NOTIFICATION_PREFERENCES_SELECT,
      },
    );

    return this.toPreferencesDto(preferences, userId);
  }

  private toNotificationDto(notification: NotificationRecord) {
    return {
      ...notification,
      metadata: notification.metadata as Record<string, unknown> | null,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private toPreferencesDto(
    preferences: NotificationPreferencesRecord | null,
    userId: string,
  ) {
    return {
      userId,
      emailEnabled: preferences?.emailEnabled ?? true,
      typePreferences: (preferences?.typePreferences ?? {}) as Record<
        string,
        { email: boolean; inApp: boolean }
      >,
      updatedAt: preferences?.updatedAt.toISOString() ?? null,
    };
  }

  private async createForProjectCapability(
    projectId: string,
    capability: Capability,
    input: CreateNotificationInput,
    options: { excludeUserIds?: readonly string[] },
    writer: NotificationWriter,
  ) {
    const project = await writer.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        slug: true,
        name: true,
        userId: true,
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!project) {
      return { count: 0 };
    }

    const excluded = new Set(options.excludeUserIds ?? []);
    const userIds = new Set<string>();

    if (!excluded.has(project.userId)) {
      userIds.add(project.userId);
    }

    for (const member of project.members) {
      if (
        roleHasCapability(member.role as MemberRole, capability) &&
        !excluded.has(member.userId)
      ) {
        userIds.add(member.userId);
      }
    }

    return this.createForUsers([...userIds], input, writer);
  }

  private isInAppDisabled(
    value: Prisma.JsonValue,
    type: NotificationType | string,
  ) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const preference = (value as Record<string, unknown>)[type];
    if (
      !preference ||
      typeof preference !== "object" ||
      Array.isArray(preference)
    ) {
      return false;
    }

    return (preference as { inApp?: unknown }).inApp === false;
  }
}

function formatUserName(firstName?: string | null, lastName?: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
}
