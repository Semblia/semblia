import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  notificationListQuerySchema,
  notificationParamsSchema,
  updateNotificationPreferencesBodySchema,
  type NotificationListQueryDto,
  type NotificationParamsDto,
  type UpdateNotificationPreferencesBodyDto,
} from "./notifications.dto.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("notifications")
@UseGuards(UserActorGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(notificationListQuerySchema))
    query: NotificationListQueryDto,
  ) {
    return this.notificationsService.list(userId, query);
  }

  @Get("unread-count")
  async unreadCount(@CurrentUserId() userId: string) {
    return { count: await this.notificationsService.unreadCount(userId) };
  }

  @Post(":notificationId/read")
  markRead(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(notificationParamsSchema))
    params: NotificationParamsDto,
  ) {
    return this.notificationsService.markRead(userId, params.notificationId);
  }

  @Post("read-all")
  markAllRead(@CurrentUserId() userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Get("preferences")
  preferences(@CurrentUserId() userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Put("preferences")
  updatePreferences(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateNotificationPreferencesBodySchema))
    body: UpdateNotificationPreferencesBodyDto,
  ) {
    return this.notificationsService.updatePreferences(userId, body);
  }
}
