import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { StudioClient } from "@/components/collect/studio/studio-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; formId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Studio — ${project.name}` : "Studio" };
}

/**
 * Forms v4 parametric studio — a self-contained, full-page editor (standalone
 * route group, no app shell). Structure (questions) + layout preset + theme
 * knobs, with a true WYSIWYG preview rendered through the production forms-core
 * renderer and draft/publish wired to the v4 contract.
 */
export default async function StudioPage(props: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <StudioClient
      slug={project.slug}
      formId={formId}
      project={{
        name: project.name,
        logoUrl: project.logo?.url ?? null,
        brandColor: project.brandColorPrimary,
        type: project.projectType,
      }}
    />
  );
}
