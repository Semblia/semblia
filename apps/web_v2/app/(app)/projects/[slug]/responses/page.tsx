import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { ResponsesInbox } from "./_responses-inbox";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Responses — ${project.name}` : "Responses" };
}

export default async function ResponsesPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  // Slug-only boundary: the client component derives all project data
  // via useProject(slug) internally.
  return <ResponsesInbox slug={slug} />;
}
