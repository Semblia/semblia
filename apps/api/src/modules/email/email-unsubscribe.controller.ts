import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { escapeHtml } from "./email-layout.js";
import {
  emailUnsubscribeQuerySchema,
  type EmailUnsubscribeQueryDto,
} from "./email-unsubscribe.dto.js";
import { EmailUnsubscribeService } from "./email-unsubscribe.service.js";

@Controller("public/email/unsubscribe")
export class EmailUnsubscribeController {
  constructor(
    @Inject(EmailUnsubscribeService)
    private readonly emailUnsubscribe: EmailUnsubscribeService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-email-unsubscribe": { limit: 60, ttl: seconds(60) } })
  @Get()
  async confirm(
    @Query(new ZodValidationPipe(emailUnsubscribeQuerySchema))
    query: EmailUnsubscribeQueryDto,
    @Res() response: Response,
  ) {
    await this.emailUnsubscribe.inspect(query.token);
    const token = escapeHtml(query.token);
    return response.type("text/html; charset=utf-8").send(
      page(
        "Unsubscribe from email",
        `<p>Confirm that you no longer want this project to email you.</p><form method="post" action="?token=${token}"><button type="submit">Unsubscribe</button></form>`,
      ),
    );
  }

  @Public()
  @SkipThrottle()
  @Throttle({ "public-email-unsubscribe": { limit: 30, ttl: seconds(60) } })
  @HttpCode(200)
  @Post()
  async unsubscribe(
    @Query(new ZodValidationPipe(emailUnsubscribeQuerySchema))
    query: EmailUnsubscribeQueryDto,
    @Res() response: Response,
  ) {
    await this.emailUnsubscribe.unsubscribe(query.token);
    return response.type("text/html; charset=utf-8").send(
      page(
        "You have been unsubscribed",
        "<p>You will no longer receive testimonial emails from this project.</p>",
      ),
    );
  }
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body><main><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;
}
