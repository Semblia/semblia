import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  runtimeFormSnapshotParamsSchema,
  runtimeFormSnapshotQuerySchema,
  runtimeSnapshotParamsSchema,
  type RuntimeFormSnapshotParamsDto,
  type RuntimeFormSnapshotQueryDto,
  type RuntimeSnapshotParamsDto,
} from "./forms.dto.js";
import { FormsService } from "./forms.service.js";

@Controller("runtime/forms")
export class RuntimeFormsController {
  constructor(@Inject(FormsService) private readonly formsService: FormsService) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get(":slug/snapshot")
  getSnapshotBySlug(
    @Param(new ZodValidationPipe(runtimeFormSnapshotParamsSchema))
    params: RuntimeFormSnapshotParamsDto,
    @Query(new ZodValidationPipe(runtimeFormSnapshotQuerySchema))
    query: RuntimeFormSnapshotQueryDto,
  ) {
    return this.formsService.getRuntimeSnapshotBySlug(params, query);
  }
}

@Controller("runtime/snapshots")
export class RuntimeSnapshotsController {
  constructor(@Inject(FormsService) private readonly formsService: FormsService) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get(":snapshotId")
  getSnapshotById(
    @Param(new ZodValidationPipe(runtimeSnapshotParamsSchema))
    params: RuntimeSnapshotParamsDto,
  ) {
    return this.formsService.getRuntimeSnapshotById(params);
  }
}
