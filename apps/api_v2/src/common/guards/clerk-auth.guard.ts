import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown> & { headers: Record<string, string> }>();

    const authorization = request.headers["authorization"];
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }

    const token = authorization.slice(7);
    const secretKey = this.configService.getOrThrow<string>("CLERK_SECRET_KEY");

    try {
      const payload = await verifyToken(token, { secretKey });
      request["clerkUserId"] = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired session token");
    }
  }
}
