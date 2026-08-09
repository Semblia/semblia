import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { actorFromRequest, type RequestWithActor } from "../authz/actor-context.js";

@Injectable()
export class UserActorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithActor>();
    const actor = actorFromRequest(request);
    if (!actor || actor.actorType !== "user") {
      throw new ForbiddenException(
        "This endpoint requires a user session; API keys and agent keys are not permitted.",
      );
    }
    return true;
  }
}
