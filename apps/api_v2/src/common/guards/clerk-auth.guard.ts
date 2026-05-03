import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { buildClerkVerifyOptions } from "../../config/security.js";
import {
  buildUserActorContext,
  parseClerkOrganizationClaim,
} from "../authz/actor-context.js";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(ConfigService)
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
      .getRequest<
        Record<string, unknown> & { headers: Record<string, string> }
      >();

    const authorization = request.headers["authorization"];
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Missing or invalid Authorization header",
      );
    }

    const token = authorization.slice(7);
    const secretKey = this.configService.getOrThrow<string>("CLERK_SECRET_KEY");
    const verifyOptions = buildClerkVerifyOptions({
      secretKey,
      authorizedParties: this.configService.get<string>(
        "CLERK_AUTHORIZED_PARTIES",
      ),
      audience: this.configService.get<string>("CLERK_JWT_AUDIENCE"),
    });

    try {
      const payload = await verifyToken(token, verifyOptions);
      const userId = payload.sub;
      const organizationClaim = parseClerkOrganizationClaim(
        (payload as Record<string, unknown>)["o"],
      );
      request["user"] = { id: userId };
      request["clerkUserId"] = userId;
      request["actor"] = buildUserActorContext(userId, organizationClaim);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired session token");
    }
  }
}
