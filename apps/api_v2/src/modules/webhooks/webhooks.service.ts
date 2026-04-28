import { Injectable, NotImplementedException } from "@nestjs/common";
import type { RazorpayWebhookBodyDto } from "./webhooks.dto.js";

@Injectable()
export class WebhooksService {
  handleRazorpayWebhook(_body: RazorpayWebhookBodyDto) {
    throw new NotImplementedException(
      "webhooks.handleRazorpayWebhook not implemented",
    );
  }
}
