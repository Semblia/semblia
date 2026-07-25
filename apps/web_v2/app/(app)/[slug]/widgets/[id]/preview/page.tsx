import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { WidgetPreviewClient } from "@/components/widgets/studio/widget-preview-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Preview — ${project.name}` : "Widget preview",
    robots: { index: false },
  };
}

export default async function WidgetPreviewPage(props: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <WidgetPreviewClient slug={project.slug} widgetId={id} />;
}
