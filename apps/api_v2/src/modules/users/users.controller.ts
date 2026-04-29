import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import {
  updateUserProfileBodySchema,
  type UpdateUserProfileBodyDto,
} from "./users.dto.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";

@Controller("me")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  getMe(@CurrentUserId() userId: string) {
    return this.usersService.getMe(userId);
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
}
