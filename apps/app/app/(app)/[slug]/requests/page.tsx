import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { RequestList } from "@/components/requests/request-list";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Requests — ${project.name}` : "Requests" };
}

export default async function RequestsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <RequestList project={project} />;
}
