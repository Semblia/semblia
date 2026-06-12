import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { SettingsShell } from "@/components/settings/settings-shell";
import { TrustClient } from "@/components/settings/trust-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Trust — ${project.name}` : "Trust" };
}

export default async function SettingsTrustPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <SettingsShell slug={slug} projectName={project.name} active="trust">
      <TrustClient project={project} />
    </SettingsShell>
  );
}
