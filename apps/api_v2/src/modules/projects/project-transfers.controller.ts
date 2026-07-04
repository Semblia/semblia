import { Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  projectTransferParamsSchema,
  type ProjectTransferParamsDto,
} from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";

@Controller("me/project-transfers")
@UseGuards(UserActorGuard)
export class ProjectTransfersController {
  constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.projectsService.listIncomingOwnershipTransfers(userId);
  }

  @Post(":transferId/accept")
  accept(
    @CurrentUserId() userId: string,
    @CurrentActor() actor: ActorContext | null,
    @Param(new ZodValidationPipe(projectTransferParamsSchema))
    params: ProjectTransferParamsDto,
  ) {
    return this.projectsService.acceptOwnershipTransfer(userId, params, actor);
  }

  @Post(":transferId/decline")
  decline(
    @CurrentUserId() userId: string,
    @CurrentActor() actor: ActorContext | null,
    @Param(new ZodValidationPipe(projectTransferParamsSchema))
    params: ProjectTransferParamsDto,
  ) {
    return this.projectsService.declineOwnershipTransfer(userId, params, actor);
  }
}
