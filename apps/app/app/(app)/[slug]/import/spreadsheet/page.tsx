import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImportSpreadsheetClient } from "@/components/imports/import-spreadsheet-client";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project
      ? `Upload a spreadsheet — ${project.name}`
      : "Upload a spreadsheet",
  };
}

export default async function ImportSpreadsheetPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();
  return <ImportSpreadsheetClient slug={project.slug} />;
}
