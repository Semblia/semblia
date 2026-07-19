import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicWallPage } from "@/components/walls/public-wall-page";
import { projectWallHostname } from "@/lib/walls/host-routing";
import {
  fetchProjectWall,
  resolveProjectWallHost,
} from "@/lib/walls/public-wall";
import { buildWallMetadata } from "@/lib/walls/wall-metadata";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

type Props = { params: Promise<{ wallSlug: string }> };

async function ownedWall(props: Props) {
  const { wallSlug } = await props.params;
  const host = projectWallHostname((await headers()).get("host"));
  if (!host) return null;
  const resolution = await resolveProjectWallHost(host);
  const primaries =
    resolution?.walls.filter((wall) => wall.isPrimaryWall) ?? [];
  if (
    primaries.length !== 1 ||
    !resolution?.walls.some((wall) => wall.wallSlug === wallSlug)
  )
    return null;
  return { host, wallSlug };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const target = await ownedWall(props);
  if (!target) return { robots: { index: false, follow: false } };
  const payload = await fetchProjectWall(target.host, target.wallSlug);
  return payload
    ? buildWallMetadata(payload)
    : { robots: { index: false, follow: false } };
}

export default async function HostedAdditionalWallPage(props: Props) {
  const target = await ownedWall(props);
  if (!target) notFound();
  const payload = await fetchProjectWall(target.host, target.wallSlug);
  if (!payload?.widget.wall) notFound();
  return <PublicWallPage payload={payload} />;
}
