"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Folder,
  Link as LinkIcon,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/shared";
import { useCreateProject } from "@/hooks/api";
import {
  getDefaultProjectCollectionUrl,
  slugifyProjectName,
} from "@/lib/project-utils";

export function ProjectCreateClient() {
  const router = useRouter();
  const createProject = useCreateProject();
  const [name, setName] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const projectName = name.trim();
    if (!projectName || createProject.isPending) return;

    try {
      const project = await createProject.mutateAsync({
        name: projectName,
        slug: slugifyProjectName(projectName),
        websiteUrl: websiteUrl.trim() || undefined,
      });
      toast.success("Project created.");
      router.push(`/projects/${project.slug}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't create that project.",
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="New project"
        actions={
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link href="/projects">
              <ArrowLeft className="size-3.5" />
              Projects
            </Link>
          </Button>
        }
      />
      <PageBody className="mx-auto grid w-full max-w-4xl gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand/10">
              <Folder className="size-5 text-brand" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Project details
            </h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Start with the name customers recognize. You can tune collection
              forms, widgets, and trust settings inside the project.
            </p>
          </div>

          <div className="max-w-md space-y-4">
            <AuthField
              id="project-name"
              label="Project name"
              value={name}
              onChange={setName}
              placeholder="e.g. Acme SaaS"
              required
              maxLength={48}
            />
            <AuthField
              id="project-website"
              label="Website"
              value={websiteUrl}
              onChange={setWebsiteUrl}
              placeholder="https://example.com"
              type="url"
              helperText="Optional. Used later for public surfaces and trusted origins."
            />
            <AuthPrimaryBtn
              type="submit"
              loading={createProject.isPending}
              loadingLabel="Creating project..."
              disabled={!name.trim()}
              className="sm:w-auto sm:px-4"
            >
              Create project
              <ArrowRight className="size-4" />
            </AuthPrimaryBtn>
          </div>
        </form>

        <aside className="space-y-3 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            First project creates
          </p>
          <SetupPreview
            icon={<LinkIcon className="size-4" />}
            title="Hosted collection URL"
            text={
              name.trim()
                ? getDefaultProjectCollectionUrl(slugifyProjectName(name))
                : "https://project.testimonials.semblia.com"
            }
          />
          <SetupPreview
            icon={<ShieldCheck className="size-4" />}
            title="Moderation queue"
            text="Review and publish only the testimonials you trust."
          />
        </aside>
      </PageBody>
    </div>
  );
}

function SetupPreview({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">{title}</p>
          <p className="mt-1 truncate text-xs leading-relaxed text-muted-foreground">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
