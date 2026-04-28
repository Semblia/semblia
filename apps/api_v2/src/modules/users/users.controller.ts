import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import {
  updateUserProfileBodySchema,
  type UpdateUserProfileBodyDto,
} from "./users.dto.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";

@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUserId() userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch("me")
  updateProfile(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateUserProfileBodySchema))
    body: UpdateUserProfileBodyDto,
  ) {
    return this.usersService.updateProfile(userId, body);
  }
}
