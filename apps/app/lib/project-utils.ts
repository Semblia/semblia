import type { V2ProjectDTO } from "@workspace/types";

export function slugifyProjectName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "my-project"
  );
}

export function getProjectCollectionUrl(project: V2ProjectDTO): string {
  return (
    project.collectionFormUrl ?? getDefaultProjectCollectionUrl(project.slug)
  );
}

export function getDefaultProjectCollectionUrl(slug: string): string {
  return `https://${slug}.testimonials.semblia.com`;
}
