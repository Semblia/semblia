import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectBySlug } from "@/lib/mock-data";
import { SettingsClient } from "@/components/settings/settings-client";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);
  return { title: project ? `Settings — ${project.name}` : "Settings" };
}

export default async function SettingsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return <SettingsClient project={project} />;
}
