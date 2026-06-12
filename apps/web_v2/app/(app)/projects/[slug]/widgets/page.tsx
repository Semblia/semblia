import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { WidgetList } from "@/components/widgets/widget-list";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Widgets — ${project.name}` : "Widgets" };
}

export default async function WidgetsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  // WidgetList currently expects MockProject — pass a compatible shim.
  // Full studio refactor is deferred to Phase 2.
  return (
    <WidgetList
      project={
        {
          ...project,
          // MockProject compat fields the widget list actually reads:
          // slug, name, brandColorPrimary — all present on V2ProjectDTO.
        } as unknown as Parameters<typeof WidgetList>[0]["project"]
      }
    />
  );
}
