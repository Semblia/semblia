import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      clerkUserId?: string;
      user?: { id?: string };
    }>();
    return request.user?.id ?? request.clerkUserId ?? "";
  },
);
