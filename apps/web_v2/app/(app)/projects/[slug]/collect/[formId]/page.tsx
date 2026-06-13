import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { serverFetchProjectBySlug } from "@/lib/semblia-api-server";
import { PageBody, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export async function generateMetadata(props: {
  params: Promise<{ slug: string; formId: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  return { title: project ? `Studio — ${project.name}` : "Studio" };
}

/**
 * FORMS V4 STUB — the freeform studio was removed with the parametric-theming
 * decision (docs/plans/2026-06-11-forms-v4-parametric-theming.md). The
 * parametric studio (structure editor + layout presets + theme knobs) is the
 * next UI-focused session. The route survives so existing links resolve.
 */
export default async function StudioPage(props: {
  params: Promise<{ slug: string; formId: string }>;
}) {
  const { slug } = await props.params;
  const project = await serverFetchProjectBySlug(slug);
  if (!project) notFound();

  return (
    <div className="flex flex-1 flex-col" data-forms-v4-stub="studio">
      <PageHeader
        contained
        title="Form studio"
        description={`${project.name} / Forms v4`}
      />
      <PageBody
        contained
        padding="default"
        maxWidth="4xl"
        className="flex items-center"
      >
        <div className="py-16 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Forms v4
          </p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            The form studio is being rebuilt
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The freeform builder has been retired. Its replacement —
            hand-designed layout presets with parametric theming — is on the
            way. Your forms and their responses are untouched.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href={`/projects/${slug}/collect`}>Back to forms</Link>
          </Button>
        </div>
      </PageBody>
    </div>
  );
}
