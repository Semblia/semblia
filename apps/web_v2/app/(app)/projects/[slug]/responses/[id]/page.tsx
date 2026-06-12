import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { ResponseDetailPage } from "./_detail-page";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Response — ${project.name}` : "Response",
  };
}

export default async function ResponseDetailPageRoute(props: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return <ResponseDetailPage slug={slug} responseId={id} />;
}
