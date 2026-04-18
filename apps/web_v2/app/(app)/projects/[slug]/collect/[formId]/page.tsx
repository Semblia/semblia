import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectBySlug } from "@/lib/mock-data";
import { StudioEditorClient } from "./_studio-editor";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; formId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);
  return { title: project ? `Studio — ${project.name}` : "Studio" };
}

export default async function StudioPage(props: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = await props.params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return <StudioEditorClient slug={project.slug} formId={formId} />;
}
