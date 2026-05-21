import { Body, Controller, Delete, Inject, Param, Post } from "@nestjs/common";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  confirmUploadBodySchema,
  createUploadIntentBodySchema,
  mediaAssetParamsSchema,
  type ConfirmUploadBodyDto,
  type CreateUploadIntentBodyDto,
  type MediaAssetParamsDto,
} from "./media.dto.js";
import { MediaService } from "./media.service.js";

@Controller("media")
export class MediaController {
  constructor(
    @Inject(MediaService) private readonly mediaService: MediaService,
  ) {}

  @Post("upload-intents")
  createUploadIntent(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(createUploadIntentBodySchema))
    body: CreateUploadIntentBodyDto,
  ) {
    return this.mediaService.createUploadIntent(actor, body);
  }

  @Post(":assetId/confirm")
  confirmUpload(
    @CurrentActor() actor: ActorContext,
    @Param(new ZodValidationPipe(mediaAssetParamsSchema))
    params: MediaAssetParamsDto,
    @Body(new ZodValidationPipe(confirmUploadBodySchema))
    body: ConfirmUploadBodyDto,
  ) {
    return this.mediaService.confirmUpload(actor, params.assetId, body);
  }

  @Delete(":assetId")
  deleteMediaAsset(
    @CurrentActor() actor: ActorContext,
    @Param(new ZodValidationPipe(mediaAssetParamsSchema))
    params: MediaAssetParamsDto,
  ) {
    return this.mediaService.hardDelete(actor, params.assetId);
  }
}
