import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImportManualClient } from "@/components/imports/import-manual-client";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Add proof manually — ${project.name}` : "Add proof",
  };
}

export default async function ImportManualPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();
  return <ImportManualClient slug={project.slug} />;
}
