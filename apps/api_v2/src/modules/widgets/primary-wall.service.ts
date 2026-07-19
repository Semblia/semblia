import { Injectable } from "@nestjs/common";
import { Prisma, type Widget, WidgetType } from "@workspace/database/prisma";

export function isEligiblePrimaryWall(
  widget: Pick<Widget, "kind" | "isActive" | "wallSlug" | "publishedSnapshot">,
): boolean {
  return (
    widget.kind === WidgetType.WALL_OF_LOVE &&
    widget.isActive &&
    widget.wallSlug !== null &&
    widget.publishedSnapshot !== null &&
    (widget.publishedSnapshot as unknown) !== Prisma.DbNull &&
    (widget.publishedSnapshot as unknown) !== Prisma.JsonNull
  );
}

@Injectable()
export class PrimaryWallService {
  async lockProject(
    tx: Prisma.TransactionClient,
    projectId: string,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT "id"
      FROM "Project"
      WHERE "id" = ${projectId}
      FOR UPDATE
    `;
  }

  async maintainPrimaryWall(
    tx: Prisma.TransactionClient,
    projectId: string,
  ): Promise<string | null> {
    const eligible = await tx.widget.findMany({
      where: {
        projectId,
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        wallSlug: { not: null },
        AND: [
          { publishedSnapshot: { not: Prisma.DbNull } },
          { publishedSnapshot: { not: Prisma.JsonNull } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, isPrimaryWall: true },
    });
    const primaryId =
      eligible.find((widget) => widget.isPrimaryWall === true)?.id ??
      eligible[0]?.id ??
      null;

    const currentPrimaries = await tx.widget.findMany({
      where: { projectId, isPrimaryWall: true },
      select: { id: true },
    });
    const stalePrimaryIds = currentPrimaries
      .map((widget) => widget.id)
      .filter((id) => id !== primaryId);
    if (stalePrimaryIds.length > 0) {
      await tx.widget.updateMany({
        where: { id: { in: stalePrimaryIds } },
        data: { isPrimaryWall: false },
      });
    }
    if (primaryId) {
      await tx.widget.updateMany({
        where: { id: primaryId, isPrimaryWall: { not: true } },
        data: { isPrimaryWall: true },
      });
    }
    return primaryId;
  }
}
