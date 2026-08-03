import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { AnalyticsPageSkeleton } from "@/components/analytics/analytics-skeleton";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Analytics — ${project.name}` : "Analytics" };
}

export default async function AnalyticsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  // The fallback is the same skeleton the client renders while its own query is
  // in flight — there used to be two hand-maintained guesses at this layout and
  // they disagreed on every dimension, so first paint went skeleton → different
  // skeleton → content.
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsDashboard projectSlug={slug} />
    </Suspense>
  );
}
