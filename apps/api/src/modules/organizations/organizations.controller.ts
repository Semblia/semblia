import { Controller, Get, Inject } from "@nestjs/common";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { OrganizationsService } from "./organizations.service.js";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get("current")
  getCurrent(@CurrentActor() actor: ActorContext | null) {
    return this.organizationsService.getCurrent(actor);
  }
}
