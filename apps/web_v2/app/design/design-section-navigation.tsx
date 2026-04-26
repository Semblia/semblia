"use client";

import { Section, Demo } from "./design-helpers";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { CaretRight as ChevronRight } from "@phosphor-icons/react";

export function NavigationSection() {
  return (
    <Section
      id="navigation"
      title="Navigation"
      description="Breadcrumb, Tabs (variants), Accordion, Collapsible, Pagination."
    >
      <div className="space-y-10">
        <Demo label="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Design System</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Demo>

        <Demo label="Tabs — Default variant">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Overview content goes here.
              </p>
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Analytics content goes here.
              </p>
            </TabsContent>
            <TabsContent value="reports" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Reports content goes here.
              </p>
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo label="Tabs — Line variant">
          <Tabs defaultValue="tab1" className="w-full">
            <TabsList variant="line">
              <TabsTrigger value="tab1">Tab One</TabsTrigger>
              <TabsTrigger value="tab2">Tab Two</TabsTrigger>
              <TabsTrigger value="tab3">Tab Three</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Line tabs feel more editorial.
              </p>
            </TabsContent>
            <TabsContent value="tab2" className="mt-4">
              <p className="text-sm text-muted-foreground">Second tab.</p>
            </TabsContent>
            <TabsContent value="tab3" className="mt-4">
              <p className="text-sm text-muted-foreground">Third tab.</p>
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo label="Vertical Tabs">
          <Tabs
            defaultValue="general"
            orientation="vertical"
            className="w-full max-w-md"
          >
            <TabsList className="h-fit">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <p className="text-sm text-muted-foreground p-2">
                General settings panel.
              </p>
            </TabsContent>
            <TabsContent value="security">
              <p className="text-sm text-muted-foreground p-2">
                Security settings panel.
              </p>
            </TabsContent>
            <TabsContent value="billing">
              <p className="text-sm text-muted-foreground p-2">
                Billing settings panel.
              </p>
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo label="Accordion">
          <Accordion type="single" collapsible className="w-full max-w-md">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is Tresta?</AccordionTrigger>
              <AccordionContent>
                Tresta is a platform for managing testimonials, reviews, and
                social proof. Built with a quiet, precise design system.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                Which components are included?
              </AccordionTrigger>
              <AccordionContent>
                55 shadcn/ui components are installed across the design system —
                from basic inputs to complex data tables and charts.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What style is used?</AccordionTrigger>
              <AccordionContent>
                The radix-nova style is applied, using Tailwind v4 and CSS
                custom properties (oklch) as design tokens.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Demo>

        <Demo label="Collapsible">
          <Collapsible className="w-full max-w-sm border border-border rounded-xl overflow-hidden">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
              Show / Hide
              <ChevronRight className="size-4 transition-transform data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 text-sm text-muted-foreground">
              This collapsible section can hide or reveal content on demand.
            </CollapsibleContent>
          </Collapsible>
        </Demo>

        <Demo label="Pagination">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Demo>
      </div>
    </Section>
  );
}
