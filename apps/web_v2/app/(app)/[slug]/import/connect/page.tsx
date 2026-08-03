import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImportConnectClient } from "@/components/imports/import-connect-client";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return {
    title: project
      ? `Connect a platform — ${project.name}`
      : "Connect a platform",
  };
}

export default async function ImportConnectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();
  return (
    // The client reads `?source=` via useSearchParams, which needs a
    // Suspense boundary above it.
    <Suspense>
      <ImportConnectClient slug={project.slug} />
    </Suspense>
  );
}
