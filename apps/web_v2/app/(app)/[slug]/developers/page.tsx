import { redirect } from "next/navigation";
import { developerKeysPath } from "@/lib/routes";

/**
 * Developers has no landing page. The sidebar lists every developer surface,
 * so an overview whose only content was links to those surfaces was
 * navigation rendered twice. API keys is the first thing anyone needs here.
 */
export default async function DevelopersPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  redirect(developerKeysPath(slug));
}
