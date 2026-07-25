import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { PageHeader } from "@/components/shared";
import { TrustClient } from "@/components/settings/trust-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Security — ${project.name}` : "Security" };
}

export default async function SettingsSecurityPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <>
      <PageHeader title="Security" />
      <TrustClient project={project} />
    </>
  );
}
