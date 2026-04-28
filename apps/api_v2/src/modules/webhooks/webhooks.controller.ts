import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Webhook } from "svix";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  clerkWebhookEventSchema,
  type ClerkWebhookEventDto,
} from "../users/users.dto.js";
import {
  razorpayWebhookBodySchema,
  type RazorpayWebhookBodyDto,
} from "./webhooks.dto.js";
import { UsersService } from "../users/users.service.js";
import { WebhooksService } from "./webhooks.service.js";

type WebhookRequest = Request & {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
};

@Controller("webhooks")
export class WebhooksController {
  constructor(
    @Inject(WebhooksService)
    private readonly webhooksService: WebhooksService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("clerk")
  async handleClerkWebhook(@Req() req: WebhookRequest) {
    const signingSecret = this.configService.get<string>(
      "CLERK_WEBHOOK_SIGNING_SECRET",
    );
    if (!signingSecret) {
      throw new UnauthorizedException("Webhook signing secret not configured");
    }

    const svixId = this.getHeaderValue(req.headers["svix-id"]);
    const svixTimestamp = this.getHeaderValue(req.headers["svix-timestamp"]);
    const svixSignature = this.getHeaderValue(req.headers["svix-signature"]);

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException("Missing Svix headers");
    }

    let event: ClerkWebhookEventDto;
    try {
      const wh = new Webhook(signingSecret);
      event = clerkWebhookEventSchema.parse(
        wh.verify(req.rawBody.toString(), {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        }),
      );
    } catch {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (event.type === "user.created" || event.type === "user.updated") {
      await this.usersService.upsertFromClerk(event.data);
    }

    return { received: true };
  }

  @Public()
  @Post("razorpay")
  handleRazorpayWebhook(
    @Body(new ZodValidationPipe(razorpayWebhookBodySchema))
    body: RazorpayWebhookBodyDto,
  ) {
    return this.webhooksService.handleRazorpayWebhook(body);
  }

  private getHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
