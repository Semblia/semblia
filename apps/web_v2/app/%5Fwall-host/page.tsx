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

async function primaryWallForHost() {
  const host = projectWallHostname((await headers()).get("host"));
  if (!host) return null;
  const resolution = await resolveProjectWallHost(host);
  const primaries =
    resolution?.walls.filter((wall) => wall.isPrimaryWall) ?? [];
  if (primaries.length !== 1) return null;
  return { host, wallSlug: primaries[0].wallSlug };
}

export async function generateMetadata(): Promise<Metadata> {
  const target = await primaryWallForHost();
  if (!target) return { robots: { index: false, follow: false } };
  const payload = await fetchProjectWall(target.host, target.wallSlug);
  return payload
    ? buildWallMetadata(payload)
    : { robots: { index: false, follow: false } };
}

export default async function HostedWallRootPage() {
  const target = await primaryWallForHost();
  if (!target) notFound();
  const payload = await fetchProjectWall(target.host, target.wallSlug);
  if (!payload?.widget.wall) notFound();
  return <PublicWallPage payload={payload} />;
}
