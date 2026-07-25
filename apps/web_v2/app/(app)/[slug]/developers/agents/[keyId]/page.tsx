import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { AgentKeyDetailClient } from "@/components/developers/agents/agent-key-detail-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; keyId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Agent key — ${project.name}` : "Agent key",
  };
}

export default async function DevelopersAgentDetailPage(props: {
  params: Promise<{ slug: string; keyId: string }>;
}) {
  const { slug, keyId } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <AgentKeyDetailClient slug={slug} keyId={keyId} />;
}
