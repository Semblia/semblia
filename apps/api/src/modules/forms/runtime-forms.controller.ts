import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { FormsRuntimeTrustService } from "../public-surfaces/forms-runtime-trust.service.js";
import {
  runtimeFormSnapshotParamsSchema,
  runtimeFormSnapshotQuerySchema,
  type RuntimeFormSnapshotParamsDto,
  type RuntimeFormSnapshotQueryDto,
} from "./forms.dto.js";
import { FormsService } from "./forms.service.js";

type RuntimeSnapshotRequest = Pick<
  Request,
  "method" | "originalUrl" | "headers"
> & { rawBody?: Buffer };

@Controller("runtime/forms")
export class RuntimeFormsController {
  constructor(
    @Inject(FormsService) private readonly formsService: FormsService,
    @Inject(FormsRuntimeTrustService)
    private readonly runtimeTrust: FormsRuntimeTrustService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get(":slug/snapshot")
  async getSnapshotBySlug(
    @Param(new ZodValidationPipe(runtimeFormSnapshotParamsSchema))
    params: RuntimeFormSnapshotParamsDto,
    @Query(new ZodValidationPipe(runtimeFormSnapshotQuerySchema))
    query: RuntimeFormSnapshotQueryDto,
    @Req() request: RuntimeSnapshotRequest,
  ) {
    const delivery = query.surface;
    const verified = await this.runtimeTrust.verifyAndResolve(request, {
      operation: delivery === "hosted" ? "HOSTED_PAGE" : "EMBED_PAGE",
      legacyProjectId: query.projectId,
    });

    return this.formsService.getRuntimeSnapshotBySlug(
      params,
      verified.projectId,
      delivery,
    );
  }
}
