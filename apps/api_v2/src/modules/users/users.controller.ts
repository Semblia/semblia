import {
  Controller,
  Get,
  Post,
  Req,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Webhook } from "svix";
import { UsersService, type ClerkUserPayload } from "./users.service.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Get("users/me")
  getMe(@CurrentUserId() userId: string) {
    return this.usersService.getMe(userId);
  }

  @Public()
  @Post("webhooks/clerk")
  async handleClerkWebhook(
    @Req()
    req: {
      rawBody: Buffer;
      headers: Record<string, string>;
    },
  ) {
    const signingSecret = this.configService.get<string>(
      "CLERK_WEBHOOK_SIGNING_SECRET",
    );
    if (!signingSecret) {
      throw new UnauthorizedException("Webhook signing secret not configured");
    }

    const svixId = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException("Missing Svix headers");
    }

    let event: ClerkWebhookEvent;
    try {
      const wh = new Webhook(signingSecret);
      event = wh.verify(req.rawBody.toString(), {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (event.type === "user.created" || event.type === "user.updated") {
      await this.usersService.upsertFromClerk(event.data);
    }

    return { received: true };
  }
}
