import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { ResponseDetail } from "@/components/responses/response-detail";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Response — ${project.name}` : "Response" };
}

export default async function ResponseDetailPage(props: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <ResponseDetail project={project} responseId={id} />;
}
