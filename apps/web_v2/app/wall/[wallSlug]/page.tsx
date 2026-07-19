import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicWallPage } from "@/components/walls/public-wall-page";
import {
  fetchPublicWall,
  type PublicWallPayload,
} from "@/lib/walls/public-wall";
import { wallLink } from "@/lib/semblia-urls";
import { buildWallMetadata } from "@/lib/walls/wall-metadata";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

interface WallPageProps {
  params: Promise<{ wallSlug: string }>;
}

/** Keep the legacy apex surface canonical until wildcard activation is approved. */
function withLegacyCanonical(
  payload: PublicWallPayload,
  wallSlug: string,
): PublicWallPayload {
  return {
    ...payload,
    seo: {
      ...payload.seo,
      canonicalUrl: wallLink(wallSlug),
    },
  };
}

export async function generateMetadata({
  params,
}: WallPageProps): Promise<Metadata> {
  const { wallSlug } = await params;
  const payload = await fetchPublicWall(wallSlug);
  if (!payload?.widget.wall) {
    return {
      title: "Wall not found",
      robots: { index: false, follow: false },
    };
  }
  return buildWallMetadata(withLegacyCanonical(payload, wallSlug));
}

/** Legacy apex compatibility adapter over the shared, no-store wall renderer. */
export default async function WallPage({ params }: WallPageProps) {
  const { wallSlug } = await params;
  const payload = await fetchPublicWall(wallSlug);
  if (!payload?.widget.wall) notFound();
  return <PublicWallPage payload={withLegacyCanonical(payload, wallSlug)} />;
}
