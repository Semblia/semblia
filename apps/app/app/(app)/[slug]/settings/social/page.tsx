import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { PageHeader } from "@/components/shared";
import { SocialForm } from "@/components/settings/social-form";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Social — ${project.name}` : "Social" };
}

export default async function SettingsSocialPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <>
      <PageHeader title="Social" />
      <SocialForm project={project} />
    </>
  );
}
