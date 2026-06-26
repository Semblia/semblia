import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";
import {
  setLastUsedProjectBodySchema,
  updateOnboardingProgressBodySchema,
  updateUserProfileBodySchema,
  type SetLastUsedProjectBodyDto,
  type UpdateOnboardingProgressBodyDto,
  type UpdateUserProfileBodyDto,
} from "./users.dto.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";

@Controller("me")
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @Get()
  getMe(@CurrentUserId() userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get("last-used-project")
  @UseGuards(UserActorGuard)
  getLastUsedProject(
    @CurrentUserId() userId: string,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.usersService.getLastUsedProject(userId, actor);
  }

  @Put("last-used-project")
  @UseGuards(UserActorGuard)
  setLastUsedProject(
    @CurrentUserId() userId: string,
    @CurrentActor() actor: ActorContext | null,
    @Body(new ZodValidationPipe(setLastUsedProjectBodySchema))
    body: SetLastUsedProjectBodyDto,
  ) {
    return this.usersService.setLastUsedProject(userId, actor, body);
  }

  @Patch()
  updateProfile(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateUserProfileBodySchema))
    body: UpdateUserProfileBodyDto,
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Post("onboarding/complete")
  completeOnboarding(@CurrentUserId() userId: string) {
    return this.usersService.completeOnboarding(userId);
  }

  @Patch("onboarding")
  updateOnboardingProgress(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateOnboardingProgressBodySchema))
    body: UpdateOnboardingProgressBodyDto,
  ) {
    return this.usersService.updateOnboardingProgress(userId, body);
  }
}
