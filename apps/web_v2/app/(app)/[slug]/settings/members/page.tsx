import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { PageHeader } from "@/components/shared";
import { MembersClient } from "@/components/settings/members-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Members — ${project.name}` : "Members" };
}

export default async function SettingsMembersPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <>
      <PageHeader title="Members" />
      <MembersClient project={project} />
    </>
  );
}
