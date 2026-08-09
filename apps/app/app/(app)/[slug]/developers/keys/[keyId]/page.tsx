import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { KeyDetailClient } from "@/components/developers/keys/key-detail-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; keyId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `API key — ${project.name}` : "API key",
  };
}

export default async function DevelopersKeyDetailPage(props: {
  params: Promise<{ slug: string; keyId: string }>;
}) {
  const { slug, keyId } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <KeyDetailClient slug={slug} keyId={keyId} />;
}
