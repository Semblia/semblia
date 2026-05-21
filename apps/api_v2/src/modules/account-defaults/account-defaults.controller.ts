import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  updateAccountDefaultsBodySchema,
  type UpdateAccountDefaultsBodyDto,
} from "./account-defaults.dto.js";
import { AccountDefaultsService } from "./account-defaults.service.js";

@Controller("account/defaults")
export class AccountDefaultsController {
  constructor(
    @Inject(AccountDefaultsService)
    private readonly accountDefaultsService: AccountDefaultsService,
  ) {}

  @Get()
  getDefaults(@CurrentUserId() userId: string) {
    return this.accountDefaultsService.getDefaults(userId);
  }

  @Patch()
  patchDefaults(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateAccountDefaultsBodySchema))
    body: UpdateAccountDefaultsBodyDto,
  ) {
    return this.accountDefaultsService.patchDefaults(userId, body);
  }
}
