import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/tresta-api-server";
import { CreateAgentKeyForm } from "@/components/developers/agents/create-agent-key-form";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `New agent key — ${project.name}` : "New agent key",
  };
}

export default async function NewAgentKeyPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <CreateAgentKeyForm slug={slug} />;
}
