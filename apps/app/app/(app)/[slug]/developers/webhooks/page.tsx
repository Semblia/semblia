import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { WebhooksClient } from "@/components/developers/webhooks/webhooks-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Webhooks — ${project.name}` : "Webhooks" };
}

export default async function DevelopersWebhooksPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <WebhooksClient slug={slug} />;
}
