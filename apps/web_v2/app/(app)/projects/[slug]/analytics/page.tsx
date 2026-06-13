import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { PageBody, PageHeader } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Analytics — ${project.name}` : "Analytics" };
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        contained
        title={<Skeleton className="h-7 w-32" />}
        description={<Skeleton className="h-3 w-48" />}
        toolbar={
          <div className="flex gap-4 pt-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
        }
      />
      <PageBody contained padding="default" contentClassName="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[108px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[248px] rounded-lg" />
        <Skeleton className="h-[160px] rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
        </div>
      </PageBody>
    </div>
  );
}

export default async function AnalyticsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsDashboard projectSlug={slug} />
    </Suspense>
  );
}
