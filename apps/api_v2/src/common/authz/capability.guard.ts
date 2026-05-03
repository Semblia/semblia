import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectAccessService } from "./project-access.service.js";
import { Capability } from "./capabilities.js";
import { REQUIRED_CAPABILITIES_KEY } from "./require-capability.decorator.js";
import {
  actorFromRequest,
  type ActorContext,
} from "./actor-context.js";
import type { ProjectAccessRole } from "./project-access.service.js";

type RequestWithAuth = {
  params?: { slug?: string };
  actor?: ActorContext;
  user?: { id?: string };
  clerkUserId?: string;
  projectAccess?: {
    projectId: string;
    role: ProjectAccessRole;
    capabilities: ReadonlySet<Capability>;
  };
};

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ProjectAccessService)
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities =
      this.reflector.getAllAndOverride<Capability[]>(
        REQUIRED_CAPABILITIES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredCapabilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const slug = request.params?.slug;
    if (!slug) {
      throw new InternalServerErrorException(
        "CapabilityGuard requires :slug param on the route",
      );
    }

    const actor = actorFromRequest(request);
    if (!actor) {
      throw new InternalServerErrorException(
        "CapabilityGuard requires request.actor or request.user.id",
      );
    }

    const resolved = await this.projectAccessService.resolveBySlug(actor, slug);

    for (const capability of requiredCapabilities) {
      if (!resolved.capabilities.has(capability)) {
        throw new ForbiddenException(`Missing capability: ${capability}`);
      }
    }

    request.projectAccess = {
      projectId: resolved.project.id,
      role: resolved.role,
      capabilities: resolved.capabilities,
    };

    return true;
  }
}
