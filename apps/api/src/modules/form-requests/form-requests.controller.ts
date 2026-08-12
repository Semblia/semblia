import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createFormRequestBodySchema,
  formRequestsListQuerySchema,
  type CreateFormRequestBodyDto,
  type FormRequestsListQueryDto,
} from "./form-requests.dto.js";
import {
  FormRequestsService,
  type FormRequestProjectRequest,
} from "./form-requests.service.js";

@Controller("projects/:slug/form-requests")
@UseGuards(CapabilityGuard)
export class FormRequestsController {
  constructor(
    @Inject(FormRequestsService)
    private readonly formRequestsService: FormRequestsService,
  ) {}

  @Post()
  @RequireCapability(Capability.REVIEW_RESPONSES)
  create(
    @Body(new ZodValidationPipe(createFormRequestBodySchema))
    body: CreateFormRequestBodyDto,
    @Req() request: FormRequestProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.formRequestsService.create(body, request, actor);
  }

  @Get()
  @RequireCapability(Capability.REVIEW_RESPONSES)
  list(
    @Query(new ZodValidationPipe(formRequestsListQuerySchema))
    query: FormRequestsListQueryDto,
    @Req() request: FormRequestProjectRequest,
  ) {
    return this.formRequestsService.list(query, request);
  }
}
