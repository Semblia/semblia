import { Controller, Get, Inject, Query } from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  publicSurfaceResolveQuerySchema,
  type PublicSurfaceResolveQueryDto,
} from "./public-surfaces.dto.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

@Controller("public-surfaces")
export class PublicSurfacesController {
  constructor(
    @Inject(PublicSurfacesService)
    private readonly publicSurfacesService: PublicSurfacesService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get("resolve")
  resolve(
    @Query(new ZodValidationPipe(publicSurfaceResolveQuerySchema))
    query: PublicSurfaceResolveQueryDto,
  ) {
    return this.publicSurfacesService.resolve(query);
  }
}
