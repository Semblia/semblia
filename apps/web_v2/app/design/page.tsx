import type { Metadata } from "next";
import { DesignSystemContent } from "./design-content";

export const metadata: Metadata = {
  title: "Design System — Tresta",
  description:
    "A comprehensive showcase of every shadcn/ui component, color token, typography scale, and design detail powering the Tresta platform.",
};

export default function DesignPage() {
  return <DesignSystemContent />;
}
