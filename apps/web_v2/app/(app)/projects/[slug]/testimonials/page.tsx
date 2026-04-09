import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TestimonialsClient } from "@/components/testimonials/testimonials-client";
import { getProjectBySlug } from "@/lib/mock-data";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);
  return { title: project ? `Testimonials — ${project.name}` : "Testimonials" };
}

export default async function TestimonialsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* ── Page header ── */}
      <header className="border-b border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects" className="text-xs">
                  Projects
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/projects/${slug}`} className="text-xs">
                  {project.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">Testimonials</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Testimonials</h1>
            <p className="text-xs text-muted-foreground">
              {project._count.testimonials} total
              {project._count.pendingModeration > 0 &&
                ` \u00b7 ${project._count.pendingModeration} pending review`}
            </p>
          </div>
        </div>
      </header>

      {/* ── Inbox ── */}
      <TestimonialsClient
        projectId={project.id}
        projectSlug={project.slug}
      />
    </div>
  );
}
