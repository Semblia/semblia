import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/nav/project-sidebar";
import { RememberLastProject } from "@/components/projects/remember-last-project";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;
  const project = await serverFetchProjectBySlug(slug);

  if (!project) notFound();

  return (
    <>
      <RememberLastProject slug={slug} />
      <ProjectSidebar slug={slug} project={project} />
      <div className="flex flex-1 flex-col lg:pl-56">{children}</div>
    </>
  );
}
