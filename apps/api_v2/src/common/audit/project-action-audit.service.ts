import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@workspace/database/prisma";
import type { ActorContext } from "../authz/actor-context.js";
import { PrismaService } from "../../modules/prisma/prisma.service.js";

type ProjectActionAuditWriter = {
  projectActionAudit: {
    create(args: {
      data: Prisma.ProjectActionAuditUncheckedCreateInput;
    }): Promise<unknown>;
  };
};

export type ProjectActionAuditInput = {
  projectId: string;
  actor: ActorContext | null | undefined;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class ProjectActionAuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  record(input: ProjectActionAuditInput) {
    return this.recordWith(this.prisma.client, input);
  }

  recordWith(writer: ProjectActionAuditWriter, input: ProjectActionAuditInput) {
    const actor = input.actor;

    return writer.projectActionAudit.create({
      data: {
        projectId: input.projectId,
        actorType: actor?.actorType ?? "system",
        actorId: actor?.userId ?? null,
        credentialId: actor?.credentialId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ...(input.metadata
          ? { metadata: input.metadata as Prisma.InputJsonObject }
          : {}),
      },
    });
  }
}
