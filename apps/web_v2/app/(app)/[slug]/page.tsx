import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectAccessDenied } from "@/components/projects/project-access-denied";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ApiError } from "@/lib/api-client";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

/** 401/403 on a project is permanent for this user, not a transient failure. */
function isAccessDenied(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

/**
 * `serverFetchProjectBySlug` maps 404 to `null` and rethrows everything else,
 * so a revoked member throws here — and an uncaught throw in `generateMetadata`
 * ejects the whole route to `error.tsx` before the layout's access-denied
 * surface ever renders, restoring exactly the "Try again" dead end this pass
 * removed. The title falls back instead.
 */
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  try {
    const project = await serverFetchProjectBySlug(slug);
    return { title: project ? project.name : "Project" };
  } catch (error) {
    if (isAccessDenied(error)) return { title: "Project" };
    throw error;
  }
}

/**
 * The project home. This route used to be a redirect stub to `/forms`, so every
 * project card, project row, and post-create navigation paid a server round
 * trip to a page with no UI before bouncing somewhere else — and the product
 * had nowhere that answered "how is this project doing?".
 */
export default async function ProjectOverviewPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  let project;
  try {
    project = await serverFetchProjectBySlug(slug);
  } catch (error) {
    // The layout catches this too, but a segment that renders concurrently with
    // its layout cannot rely on the layout's early return to stop it — and a
    // throw from here would win the race and land on the generic route error.
    if (isAccessDenied(error)) return <ProjectAccessDenied />;
    throw error;
  }

  if (!project) notFound();

  return <ProjectOverview project={project} />;
}
