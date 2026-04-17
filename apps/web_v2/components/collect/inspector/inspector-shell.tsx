"use client";

import * as React from "react";
import {
  TypeIcon,
  ListChecksIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  GlobeIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ContentPanel } from "./content-panel";
import { FieldsPanel } from "./fields-panel";
import { BrandingPanel } from "./branding-panel";
import { BehaviorPanel } from "./behavior-panel";
import { DeliveryPanel } from "./delivery-panel";
import type { FormConfig } from "@/lib/collect/types";

export type InspectorTab =
  | "content"
  | "fields"
  | "branding"
  | "behavior"
  | "delivery";

const TABS: { id: InspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "content", label: "Content", icon: TypeIcon },
  { id: "fields", label: "Fields", icon: ListChecksIcon },
  { id: "branding", label: "Branding", icon: PaletteIcon },
  { id: "behavior", label: "Behavior", icon: SlidersHorizontalIcon },
  { id: "delivery", label: "Delivery", icon: GlobeIcon },
];

export function InspectorShell({
  slug,
  config,
  defaultTab = "content",
  className,
}: {
  slug: string;
  config: FormConfig;
  defaultTab?: InspectorTab;
  className?: string;
}) {
  return (
    <Tabs
      defaultValue={defaultTab}
      data-slot="inspector-shell"
      className={cn("flex h-full min-h-0 flex-col gap-0", className)}
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
        <TabsList variant="line" className="w-full justify-start gap-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                data-testid={`tab-${t.id}`}
                className="gap-1 px-2 text-[11px]"
              >
                <Icon className="size-3.5" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TabsContent value="content" className="m-0 animate-in fade-in-0 duration-150 focus-visible:outline-none">
          <ContentPanel slug={slug} config={config} />
        </TabsContent>
        <TabsContent value="fields" className="m-0 animate-in fade-in-0 duration-150 focus-visible:outline-none">
          <FieldsPanel slug={slug} config={config} />
        </TabsContent>
        <TabsContent value="branding" className="m-0 animate-in fade-in-0 duration-150 focus-visible:outline-none">
          <BrandingPanel slug={slug} config={config} />
        </TabsContent>
        <TabsContent value="behavior" className="m-0 animate-in fade-in-0 duration-150 focus-visible:outline-none">
          <BehaviorPanel slug={slug} config={config} />
        </TabsContent>
        <TabsContent value="delivery" className="m-0 animate-in fade-in-0 duration-150 focus-visible:outline-none">
          <DeliveryPanel slug={slug} config={config} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
