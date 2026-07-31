import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@workspace/database/prisma";
import type { ActorContext } from "../authz/actor-context.js";
import { paginate } from "../utils/paginate.js";
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

export type ProjectActionAuditListQuery = {
  page: number;
  pageSize: number;
  actorType?: "user" | "api_key" | "agent_key" | "system";
  actorId?: string;
  credentialId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
};

const PROJECT_ACTION_AUDIT_SELECT = {
  id: true,
  projectId: true,
  actorType: true,
  actorId: true,
  credentialId: true,
  action: true,
  targetType: true,
  targetId: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.ProjectActionAuditSelect;

@Injectable()
export class ProjectActionAuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  record(input: ProjectActionAuditInput) {
    return this.recordWith(this.prisma.client, input);
  }

  recordWith(writer: ProjectActionAuditWriter, input: ProjectActionAuditInput) {
    return writer.projectActionAudit.create({
      data: this.toCreateInput(input),
    });
  }

  /** Batch write — used by event-shaped recorders like forms theme telemetry. */
  recordMany(inputs: ProjectActionAuditInput[]) {
    return this.prisma.client.projectActionAudit.createMany({
      data: inputs.map((input) => this.toCreateInput(input)),
    });
  }

  private toCreateInput(
    input: ProjectActionAuditInput,
  ): Prisma.ProjectActionAuditUncheckedCreateInput {
    const actor = input.actor;
    return {
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
    };
  }

  async list(projectId: string, query: ProjectActionAuditListQuery) {
    const where: Prisma.ProjectActionAuditWhereInput = {
      projectId,
      ...(query.actorType ? { actorType: query.actorType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.credentialId ? { credentialId: query.credentialId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [total, rows] = await Promise.all([
      this.prisma.client.projectActionAudit.count({ where }),
      this.prisma.client.projectActionAudit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: PROJECT_ACTION_AUDIT_SELECT,
      }),
    ]);

    return paginate({
      data: rows.map((row) => ({
        ...row,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
