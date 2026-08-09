import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";
import { buildClerkVerifyOptions } from "../../config/security.js";

export type AdminActorContext = {
  type: "admin_session";
  clerkUserId: string;
};

export type AdminAuthRequest = Record<string, unknown> & {
  adminActor?: AdminActorContext;
  adminClerkUserId?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ClerkAdminAuthGuard implements CanActivate {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminAuthRequest>();
    const token = this.getBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(
        "Missing or invalid Authorization header",
      );
    }

    const secretKey = this.configService.get<string>("ADMIN_CLERK_SECRET_KEY");
    if (!secretKey) {
      throw new UnauthorizedException("Admin auth is not configured");
    }

    const verifyOptions = buildClerkVerifyOptions({
      secretKey,
      authorizedParties: this.configService.get<string>(
        "ADMIN_CLERK_AUTHORIZED_PARTIES",
      ),
      audience: this.configService.get<string>("ADMIN_CLERK_JWT_AUDIENCE"),
    });

    try {
      const payload = await verifyToken(token, verifyOptions);
      request.adminClerkUserId = payload.sub;
      request.adminActor = {
        type: "admin_session",
        clerkUserId: payload.sub,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired admin session token");
    }
  }

  private getBearerToken(request: AdminAuthRequest): string | null {
    const authorization = request.headers?.authorization;
    const value = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (!value?.startsWith("Bearer ")) return null;
    const token = value.slice(7).trim();
    return token || null;
  }
}
