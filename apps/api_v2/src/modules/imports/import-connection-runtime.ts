import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { Capability } from "../../common/authz/capabilities.js";
import { ProjectAccessService } from "../../common/authz/project-access.service.js";
import type { ConnectedAccountTokenProvider } from "../integrations/token-providers/connected-account-token-provider.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ImportJobQueuePayload } from "./imports.service.js";

export type ImportConnectionRuntimeRecord = {
  id: string;
  projectId: string;
  connectedByUserId: string | null;
  project: {
    slug: string;
    organization: { clerkOrgId: string | null } | null;
  };
};

export type ImportConnectionRuntimeContext = {
  prisma: PrismaService;
  importQueue: Queue<ImportJobQueuePayload>;
  connectedTokens?: ConnectedAccountTokenProvider;
  projectAccess?: ProjectAccessService;
};

export class ImportConnectionRuntime {
  constructor(private readonly context: ImportConnectionRuntimeContext) {}

  async requireConnectionFence(
    connection: ImportConnectionRuntimeRecord,
    scheduled: boolean,
  ) {
    const fence = await this.context.prisma.client.importConnection.findFirst({
      where: {
        id: connection.id,
        projectId: connection.projectId,
        enabled: true,
        ...(scheduled ? { autoSyncEnabled: true } : {}),
      },
      select: { id: true },
    });
    if (!fence) throw new ConflictException("Import connection is disabled");
  }

  async requireConnectedConnectionFence(
    connection: ImportConnectionRuntimeRecord,
    scheduled: boolean,
  ) {
    await this.requireConnectionFence(connection, scheduled);
    if (!connection.connectedByUserId)
      return this.disableUnauthorizedConnection(connection);
    if (!this.context.projectAccess)
      throw new ConflictException("Project access is unavailable");
    let directAccessDenied = false;
    try {
      const access = await this.context.projectAccess.resolveBySlug(
        connection.connectedByUserId,
        connection.project.slug,
      );
      if (access.capabilities.has(Capability.OPERATE_PROJECT)) return;
      directAccessDenied = true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        directAccessDenied = true;
      else throw error;
    }
    const clerkOrgId = connection.project.organization?.clerkOrgId;
    if (directAccessDenied && clerkOrgId) {
      const tokenProvider = this.requireConnectedTokens();
      if (!tokenProvider.hasOrganizationMembership)
        throw new ConflictException("Clerk organization access is unavailable");
      if (
        await tokenProvider.hasOrganizationMembership({
          userId: connection.connectedByUserId,
          organizationId: clerkOrgId,
        })
      )
        return;
    }
    return this.disableUnauthorizedConnection(connection);
  }

  async disableUnauthorizedConnection(
    connection: ImportConnectionRuntimeRecord,
  ): Promise<never> {
    await this.context.prisma.client.importConnection.updateMany({
      where: { id: connection.id, projectId: connection.projectId },
      data: { enabled: false, autoSyncEnabled: false },
    });
    await this.removeScheduler(connection.id).catch(() => undefined);
    throw new ForbiddenException("Connected user no longer has import access");
  }

  upsertScheduler(connectionId: string, everyMs: number) {
    return this.context.importQueue.upsertJobScheduler(
      `import-${connectionId}`,
      { every: everyMs },
      {
        name: "import-connected-sync",
        data: { jobId: `connection:${connectionId}` },
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    );
  }

  removeScheduler(connectionId: string) {
    return this.context.importQueue.removeJobScheduler(
      `import-${connectionId}`,
    );
  }

  private requireConnectedTokens() {
    if (!this.context.connectedTokens)
      throw new ConflictException("Connected account access is unavailable");
    return this.context.connectedTokens;
  }
}
