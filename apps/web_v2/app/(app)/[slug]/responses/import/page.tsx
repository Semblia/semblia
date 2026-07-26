import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImportCenter } from "@/components/imports/import-center";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Import proof — ${project.name}` : "Import proof" };
}

export default async function ImportPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();
  return <ImportCenter project={project} />;
}
