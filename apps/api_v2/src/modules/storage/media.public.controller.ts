import { Body, Controller, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { publicProjectSlugParamsSchema } from "../testimonials/testimonials.dto.js";
import { PublicSubmitThrottlerGuard } from "../testimonials/public-submit-throttler.guard.js";
import {
  publicCreateUploadIntentBodySchema,
  type PublicCreateUploadIntentBodyDto,
} from "./media.dto.js";
import { MediaService } from "./media.service.js";

type PublicMediaRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

@Controller("public-surfaces/:slug/media")
export class MediaPublicController {
  constructor(
    @Inject(MediaService) private readonly mediaService: MediaService,
  ) {}

  @Public()
  @SkipThrottle()
  @UseGuards(PublicSubmitThrottlerGuard)
  @Throttle({ "public-media-intent": { limit: 20, ttl: seconds(60) } })
  @Post("upload-intents")
  createPublicUploadIntent(
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    params: { slug: string },
    @Body(new ZodValidationPipe(publicCreateUploadIntentBodySchema))
    body: PublicCreateUploadIntentBodyDto,
    @Req() request: PublicMediaRequest,
  ) {
    return this.mediaService.createPublicUploadIntent(
      params.slug,
      body,
      request,
    );
  }
}
