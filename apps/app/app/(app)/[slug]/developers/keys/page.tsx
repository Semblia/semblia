import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { KeysClient } from "@/components/developers/keys/keys-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `API keys — ${project.name}` : "API keys" };
}

export default async function DevelopersKeysPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <KeysClient slug={slug} />;
}
