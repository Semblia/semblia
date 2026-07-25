import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { WidgetStudioClient } from "./_studio-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Widget Studio — ${project.name}` : "Widget Studio",
  };
}

export default async function WidgetDetailPage(props: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <WidgetStudioClient slug={project.slug} widgetId={id} />;
}
