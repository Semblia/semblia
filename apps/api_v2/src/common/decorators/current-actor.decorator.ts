import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
  actorFromRequest,
  type ActorContext,
  type RequestWithActor,
} from "../authz/actor-context.js";

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithActor>();
    return actorFromRequest(request);
  },
);
