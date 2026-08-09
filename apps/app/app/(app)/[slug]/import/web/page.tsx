import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImportWebClient } from "@/components/imports/import-web-client";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project
      ? `Import from the web — ${project.name}`
      : "Import from the web",
  };
}

export default async function ImportWebPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();
  return <ImportWebClient slug={project.slug} />;
}
