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
import { Throttle, seconds } from "@nestjs/throttler";
import { Webhook } from "svix";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { verifyRazorpayWebhookSignature } from "../../config/security.js";
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

@Throttle({ default: { limit: 60, ttl: seconds(60) } })
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
    @Req() req: WebhookRequest,
    @Body(new ZodValidationPipe(razorpayWebhookBodySchema))
    body: RazorpayWebhookBodyDto,
  ) {
    const signingSecret = this.configService.get<string>(
      "RAZORPAY_WEBHOOK_SECRET",
    );
    if (!signingSecret) {
      throw new UnauthorizedException("Razorpay webhook secret not configured");
    }

    const signature = this.getHeaderValue(req.headers["x-razorpay-signature"]);
    if (!signature) {
      throw new BadRequestException("Missing Razorpay signature");
    }

    if (
      !verifyRazorpayWebhookSignature(req.rawBody, signature, signingSecret)
    ) {
      throw new UnauthorizedException("Invalid Razorpay webhook signature");
    }

    return this.webhooksService.handleRazorpayWebhook(body);
  }

  private getHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
