"use client";

import { Section, Demo } from "./design-helpers";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Kbd } from "@/components/ui/kbd";
import {
  TextB as Bold,
  TextItalic as Italic,
  TextUnderline as Underline,
  TextAlignLeft as AlignLeft,
  TextAlignCenter as AlignCenter,
  TextAlignRight as AlignRight,
  Star,
} from "@phosphor-icons/react";

const TABLE_ROWS = [
  { name: "Alice Martin", status: "Active", role: "Admin", rating: 4.9 },
  { name: "Bob Chen", status: "Invited", role: "Editor", rating: 4.2 },
  { name: "Carol Davis", status: "Active", role: "Viewer", rating: 4.7 },
];

export function DataDisplaySection() {
  return (
    <Section
      id="data"
      title="Data Display"
      description="Table, ScrollArea, Separator, and AspectRatio."
    >
      <div className="space-y-10">
        <Demo label="Table">
          <div className="w-full overflow-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TABLE_ROWS.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "Active" ? "default" : "outline"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="size-3 text-foreground" />
                        {row.rating}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Demo>

        <Demo label="ScrollArea">
          <ScrollArea className="h-40 w-full max-w-xs rounded-xl border border-border p-3">
            {Array.from({ length: 15 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-0"
              >
                <div className="size-2 rounded-full bg-primary" />
                Item {i + 1} — Scrollable list row
              </div>
            ))}
          </ScrollArea>
        </Demo>

        <Demo label="Separator">
          <div className="w-full space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Before separator</p>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">After separator</p>
            </div>
            <div className="flex h-8 items-center gap-3">
              <span className="text-sm text-muted-foreground">Left</span>
              <Separator orientation="vertical" />
              <span className="text-sm text-muted-foreground">Right</span>
            </div>
          </div>
        </Demo>
      </div>
    </Section>
  );
}

export function MiscSection() {
  return (
    <Section
      id="misc"
      title="Miscellaneous"
      description="Toggle, ToggleGroup, Kbd, and other utility components."
    >
      <div className="space-y-8">
        <Demo label="Toggle">
          <Toggle aria-label="Bold"><Bold /> Bold</Toggle>
          <Toggle variant="outline" aria-label="Italic"><Italic /> Italic</Toggle>
          <Toggle size="sm" aria-label="Underline"><Underline /></Toggle>
          <Toggle size="lg" aria-label="Star"><Star /></Toggle>
        </Demo>

        <Demo label="Toggle Group">
          <ToggleGroup type="single" defaultValue="center">
            <ToggleGroupItem value="left" aria-label="Left"><AlignLeft /></ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Center"><AlignCenter /></ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Right"><AlignRight /></ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="multiple">
            <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>
          </ToggleGroup>
        </Demo>

        <Demo label="Keyboard Shortcut (Kbd)">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Search <Kbd>⌘</Kbd><Kbd>K</Kbd>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Save <Kbd>Ctrl</Kbd><Kbd>S</Kbd>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Theme <Kbd>⇧</Kbd><Kbd>D</Kbd>
            </div>
          </div>
        </Demo>
      </div>
    </Section>
  );
}
