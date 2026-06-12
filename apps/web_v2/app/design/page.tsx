import type { Metadata } from "next";
import { DesignSystemContent } from "./design-content";

export const metadata: Metadata = {
  title: "Design System — Semblia",
  description:
    "A comprehensive showcase of every shadcn/ui component, color token, typography scale, and design detail powering the Semblia platform.",
};

export default function DesignPage() {
  return <DesignSystemContent />;
}
