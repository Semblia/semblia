import { notFound } from "next/navigation";
import { ProjectAccessDenied } from "@/components/projects/project-access-denied";
import { RememberLastProject } from "@/components/projects/remember-last-project";
import { serverFetchProjectAccess } from "@/lib/semblia-api-server";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Guards the project context. Navigation itself lives in the app-wide sidebar
 * (`components/nav/app-sidebar.tsx`), which resolves the project from the URL —
 * so this layout adds no chrome of its own.
 *
 * It owns one distinction the pages beneath it cannot make. A member removed
 * from a project, a revoked invite, or a wrong-org slug all produce a 403, and
 * a 403 used to land on the generic route error with a "Try again" button that
 * could never succeed. A permission denial is a permanent failure and gets a
 * surface that says so, with no retry.
 *
 * The guard has to live here rather than in the pages because every project
 * page fetches the project itself: a thrown 403 reached the route boundary
 * before any guard could render. Returning the denial surface *instead of*
 * `children` means the page beneath is never rendered, so it never re-fetches
 * the project it was just denied.
 */
export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;
  const access = await serverFetchProjectAccess(slug);

  if (access.status === "forbidden") return <ProjectAccessDenied />;
  if (access.status === "missing") notFound();

  return (
    <>
      <RememberLastProject slug={slug} />
      {children}
    </>
  );
}
