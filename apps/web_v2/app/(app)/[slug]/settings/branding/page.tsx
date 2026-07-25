import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { SettingsShell } from "@/components/settings/settings-shell";
import { BrandingForm } from "@/components/settings/branding-form";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project ? `Branding — ${project.name}` : "Branding",
  };
}

export default async function SettingsBrandingPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <SettingsShell slug={slug} projectName={project.name} active="branding">
      <BrandingForm project={project} />
    </SettingsShell>
  );
}
