import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { FormPreviewClient } from "@/components/forms/studio/form-preview-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; formId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Preview — ${project.name}` : "Form preview",
    robots: { index: false },
  };
}

export default async function FormPreviewPage(props: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <FormPreviewClient slug={project.slug} formId={formId} />;
}
