import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImportMigrateClient } from "@/components/imports/import-migrate-client";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Migrate a wall — ${project.name}` : "Migrate a wall",
  };
}

export default async function ImportMigratePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();
  return <ImportMigrateClient slug={project.slug} />;
}
