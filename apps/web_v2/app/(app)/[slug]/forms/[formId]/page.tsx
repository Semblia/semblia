import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { FormStudioClient } from "./_studio-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; formId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Form Studio — ${project.name}` : "Form Studio" };
}

export default async function FormStudioPage(props: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug, formId } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <FormStudioClient slug={project.slug} formId={formId} />;
}
