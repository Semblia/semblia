import { redirect } from "next/navigation";
import { responsesPath } from "@/lib/routes";

/**
 * A project has no dashboard.
 *
 * A landing page whose content is links onward is navigation rendered twice —
 * the sidebar already lists every destination, and a summary screen that only
 * points elsewhere costs a click on the way to the actual work. The first thing
 * an owner wants on opening a project is what is waiting for them, so the
 * project root *is* the review queue.
 *
 * Metrics that would have justified an overview live where their rows live:
 * the pending count on the queue header, delivery numbers in Analytics, form
 * and widget state on their own surfaces. A number with no rows behind it is a
 * dead end, and a screen made of them is a dead end with a layout.
 */
export default async function ProjectHomePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  redirect(responsesPath(slug));
}
