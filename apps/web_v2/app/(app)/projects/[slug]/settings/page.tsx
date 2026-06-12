import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { SettingsShell } from "@/components/settings/settings-shell";
import { GeneralForm } from "@/components/settings/general-form";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Settings — ${project.name}` : "Settings" };
}

export default async function SettingsGeneralPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <SettingsShell slug={slug} projectName={project.name} active="general">
      <GeneralForm project={project} />
    </SettingsShell>
  );
}
