import { notFound } from "next/navigation";
import { RememberLastProject } from "@/components/projects/remember-last-project";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Guards the project context. Navigation itself lives in the app-wide sidebar
 * (`components/nav/app-sidebar.tsx`), which resolves the project from the URL —
 * so this layout adds no chrome of its own.
 */
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
      {children}
    </>
  );
}
