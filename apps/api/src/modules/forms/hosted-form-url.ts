import { ConflictException } from "@nestjs/common";
import type { Prisma } from "@workspace/database/prisma";
import { findDefaultLiveHostname } from "../public-surfaces/default-hostname.js";

type HostedFormWriter = Pick<Prisma.TransactionClient, "publicSurfaceHost">;

export type ReachableForm = {
  id: string;
  name: string;
  slug: string;
};

export function requireReachableForm(form: {
  id: string;
  name: string;
  slug: string | null;
  status: string;
}): ReachableForm {
  if (!form.slug || form.status !== "PUBLISHED") {
    throw new ConflictException(
      `${form.name} is not published yet, so its link would not work.`,
    );
  }
  return { id: form.id, name: form.name, slug: form.slug };
}

/**
 * Snapshots published before the 2026-07-17 delivery split lack the key —
 * they are hosted, the same default the forms runtime applies at serve time.
 */
export function snapshotDelivery(snapshot: unknown): "hosted" | "embed" {
  const delivery = (snapshot as { delivery?: unknown } | null)?.delivery;
  return delivery === "embed" ? "embed" : "hosted";
}

export async function requireHostedDelivery(
  writer: Pick<Prisma.TransactionClient, "formVersion">,
  form: { id: string; name: string; currentVersion: number | null },
): Promise<void> {
  const version = form.currentVersion
    ? await writer.formVersion.findFirst({
        where: {
          formId: form.id,
          version: form.currentVersion,
          status: "PUBLISHED",
        },
        select: { snapshot: true },
      })
    : null;
  if (!version || snapshotDelivery(version.snapshot) !== "hosted") {
    throw new ConflictException(
      `${form.name} is delivered as an embed, so it has no public page to invite them to.`,
    );
  }
}

export async function hostedFormUrl(
  writer: HostedFormWriter,
  projectId: string,
  slug: string,
  formName: string,
): Promise<string> {
  const hostname = await findDefaultLiveHostname(writer, {
    projectId,
    feature: "COLLECTION",
  });
  if (!hostname) {
    throw new ConflictException(
      `${formName} has no live public address yet, so its link would not work. Check the project's domains.`,
    );
  }
  return `https://${hostname}/f/${encodeURIComponent(slug)}`;
}
