"use client";

import * as React from "react";
import { ThemeToggle } from "./theme-toggle";

// ── UI Components ──────────────────────────────────────────────
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";

// ── Icons ──────────────────────────────────────────────────────
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BellRing,
  ChevronRight,
  MoreHorizontal,
  Star,
  Heart,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Pencil,
  Trash2,
  Settings,
  User,
  LogOut,
  Mail,
  Phone,
  Search,
  Plus,
  Download,
  Share2,
  Layers,
  Palette,
  Type,
  Radius,
  Box,
  Hash,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Separator />
      <div>{children}</div>
    </section>
  );
}

// Token swatch
function Swatch({
  variable,
  label,
  textClass,
}: {
  variable: string;
  label: string;
  textClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-lg border border-border/60 shadow-sm"
        style={{ background: `var(${variable})` }}
      />
      <div className="space-y-0.5">
        <p className={`text-xs font-medium ${textClass ?? "text-foreground"}`}>
          {label}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {variable}
        </p>
      </div>
    </div>
  );
}

// Demo card wrapper
function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className={`flex flex-wrap items-start gap-3 ${className ?? ""}`}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Nav items
// ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "principles", label: "Principles", icon: Star },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "radius-spacing", label: "Radius & Spacing", icon: Radius },
  { id: "elevation", label: "Elevation & Motion", icon: Layers },
  { id: "buttons", label: "Buttons", icon: Box },
  { id: "badges", label: "Badges", icon: Hash },
  { id: "alerts", label: "Alerts", icon: BellRing },
  { id: "avatars", label: "Avatars", icon: User },
  { id: "cards", label: "Cards", icon: Layers },
  { id: "forms", label: "Forms & Inputs", icon: Pencil },
  { id: "feedback", label: "Feedback", icon: CheckCircle2 },
  { id: "overlays", label: "Overlays", icon: Layers },
  { id: "navigation", label: "Navigation", icon: ChevronRight },
  { id: "data", label: "Data Display", icon: Hash },
  { id: "misc", label: "Misc", icon: Star },
];

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────
export function DesignSystemContent() {
  const [activeSection, setActiveSection] = React.useState("colors");
  const [calendarDate, setCalendarDate] = React.useState<Date | undefined>(
    new Date(),
  );

  // Intersection observer for active nav
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-background text-foreground">
        {/* ── Top bar ──────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-foreground">
                <span className="text-xs font-bold text-background">T</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Tresta
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm text-muted-foreground">
                  Design System
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">v1.0</Badge>
              <Badge variant="secondary">radix-nova</Badge>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-screen-xl gap-0 px-6 py-8">
          {/* ── Sidebar nav ──────────────────────────────────── */}
          <aside className="sticky top-24 h-fit w-52 shrink-0 pr-8">
            <nav className="space-y-1">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(id)
                      ?.scrollIntoView({ behavior: "smooth" });
                    setActiveSection(id);
                  }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                    activeSection === id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── Content ──────────────────────────────────────── */}
          <main className="min-w-0 flex-1 space-y-16">
            {/* ══ 0. Principles ══ */}
            <Section
              id="principles"
              title="Design Principles"
              description="The six pillars of Tresta's Quiet Precision design language - calm, fast, precise, delightful, empowering, and focused."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: "Calm Confidence", desc: "Every screen tells the user exactly what to do next. No ambiguity, no noise. Clear hierarchy, clear path.", accent: "#" },
                  { title: "Fast & Fluid", desc: "150ms micro-interactions. No layout shifts. Transitions feel instant yet intentional.", accent: "#" },
                  { title: "Precision & Trust", desc: "Consistent spacing grid. Single typeface family. Tokens enforced everywhere — nothing is magic-numbered.", accent: "#" },
                  { title: "Refined Delight", desc: "Subtle fade-ups on scroll, warm amber accent used sparingly as a reward signal, not decoration.", accent: "#" },
                  { title: "Empowerment", desc: "Stats surface user impact. Progress is always visible. Users know they're building something meaningful.", accent: "#" },
                  { title: "Quiet Focus", desc: "Low chroma palette. Warm neutrals instead of cold grays. Never compete with the user's content.", accent: "#" },
                ].map(({ title, desc }) => (
                  <div key={title} className="stat-card animate-fade-up">
                    <div className="brand-strip mb-3">
                      <p className="label-quiet">Principle</p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ══ 1. Colors ══ */}
            <Section
              id="colors"
              title="Color Tokens"
              description="All CSS custom properties defined in :root and .dark. These are the foundational design tokens."
            >
              <div className="space-y-8">
                <Demo label="Core Semantic">
                  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <Swatch variable="--background" label="Background" />
                    <Swatch variable="--foreground" label="Foreground" />
                    <Swatch variable="--primary" label="Primary" />
                    <Swatch variable="--primary-foreground" label="Primary FG" />
                    <Swatch variable="--secondary" label="Secondary" />
                    <Swatch variable="--secondary-foreground" label="Secondary FG" />
                    <Swatch variable="--muted" label="Muted" />
                    <Swatch variable="--muted-foreground" label="Muted FG" />
                    <Swatch variable="--accent" label="Accent" />
                    <Swatch variable="--accent-foreground" label="Accent FG" />
                    <Swatch variable="--destructive" label="Destructive" />
                  </div>
                </Demo>

                <Demo label="Brand Accent — Amber Sand (used sparingly)">
                  <div className="grid w-full grid-cols-3 gap-4">
                    <Swatch variable="--brand" label="Brand" />
                    <Swatch variable="--brand-foreground" label="Brand FG" />
                    <Swatch variable="--brand-muted" label="Brand Muted" />
                  </div>
                  <div className="w-full">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The brand accent is the only non-neutral hue in the system. Use it exclusively for calls-to-action,
                      progress milestones, highlights, and sidebar active states in dark mode. Never use it for decoration.
                    </p>
                  </div>
                </Demo>

                <Demo label="Semantic Status">
                  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
                    <Swatch variable="--success" label="Success" />
                    <Swatch variable="--success-foreground" label="Success FG" />
                    <Swatch variable="--warning" label="Warning" />
                    <Swatch variable="--warning-foreground" label="Warning FG" />
                  </div>
                </Demo>

                <Demo label="Surface & Border">
                  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <Swatch variable="--card" label="Card" />
                    <Swatch variable="--card-foreground" label="Card FG" />
                    <Swatch variable="--popover" label="Popover" />
                    <Swatch variable="--popover-foreground" label="Popover FG" />
                    <Swatch variable="--border" label="Border" />
                    <Swatch variable="--input" label="Input" />
                    <Swatch variable="--ring" label="Ring" />
                  </div>
                </Demo>

                <Demo label="Chart Palette — Warm Sequential">
                  <div className="grid w-full grid-cols-5 gap-4">
                    <Swatch variable="--chart-1" label="Amber (Brand)" />
                    <Swatch variable="--chart-2" label="Sage" />
                    <Swatch variable="--chart-3" label="Slate Blue" />
                    <Swatch variable="--chart-4" label="Muted Rose" />
                    <Swatch variable="--chart-5" label="Deep Slate" />
                  </div>
                </Demo>

                <Demo label="Sidebar">
                  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <Swatch variable="--sidebar" label="Sidebar" />
                    <Swatch variable="--sidebar-foreground" label="Sidebar FG" />
                    <Swatch variable="--sidebar-primary" label="Sidebar Primary" />
                    <Swatch variable="--sidebar-primary-foreground" label="Sidebar Primary FG" />
                    <Swatch variable="--sidebar-accent" label="Sidebar Accent" />
                    <Swatch variable="--sidebar-accent-foreground" label="Sidebar Accent FG" />
                    <Swatch variable="--sidebar-border" label="Sidebar Border" />
                    <Swatch variable="--sidebar-ring" label="Sidebar Ring" />
                  </div>
                </Demo>
              </div>
            </Section>

            {/* ══ 2. Typography ══ */}
            <Section
              id="typography"
              title="Typography"
              description="Font families, size scale, weight, and line-height utilities."
            >
              <div className="space-y-8">
                <Demo label="Headings">
                  <div className="w-full space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">
                      Display / H1 — The quick brown fox
                    </h1>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      H2 — Jumps over the lazy dog
                    </h2>
                    <h3 className="text-2xl font-semibold">
                      H3 — Design systems matter
                    </h3>
                    <h4 className="text-xl font-medium">
                      H4 — Consistency at every pixel
                    </h4>
                    <h5 className="text-lg font-medium">
                      H5 — Thoughtful components
                    </h5>
                    <h6 className="text-base font-medium">
                      H6 — Radix Nova style
                    </h6>
                  </div>
                </Demo>

                <Demo label="Body Sizes">
                  <div className="w-full space-y-2">
                    <p className="text-xl">
                      text-xl — Large body for hero sections and lead
                      paragraphs.
                    </p>
                    <p className="text-lg">
                      text-lg — Section intros and prominent descriptions.
                    </p>
                    <p className="text-base">
                      text-base — Default body text for general content.
                    </p>
                    <p className="text-sm">
                      text-sm — UI labels, card bodies, and secondary content.
                    </p>
                    <p className="text-xs">
                      text-xs — Captions, timestamps, metadata.
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      font-mono — Code, keys, and technical strings.
                    </p>
                  </div>
                </Demo>

                <Demo label="Weights & Styles">
                  <div className="w-full space-y-2">
                    <p className="font-light">font-light — Light weight 300</p>
                    <p className="font-normal">
                      font-normal — Regular weight 400
                    </p>
                    <p className="font-medium">
                      font-medium — Medium weight 500
                    </p>
                    <p className="font-semibold">
                      font-semibold — Semibold weight 600
                    </p>
                    <p className="font-bold">font-bold — Bold weight 700</p>
                    <p className="italic">italic — Italic style</p>
                    <p className="line-through text-muted-foreground">
                      line-through — Strikethrough
                    </p>
                    <p className="underline underline-offset-4">
                      underline — With offset
                    </p>
                  </div>
                </Demo>

                <Demo label="Colors on Text">
                  <div className="w-full space-y-2">
                    <p className="text-foreground">
                      text-foreground — Primary text
                    </p>
                    <p className="text-muted-foreground">
                      text-muted-foreground — Subdued text
                    </p>
                    <p className="text-primary">text-primary — Primary color</p>
                    <p className="text-destructive">
                      text-destructive — Error / danger
                    </p>
                  </div>
                </Demo>
              </div>
            </Section>

            {/* ══ 3. Radius & Spacing ══ */}
            <Section
              id="radius-spacing"
              title="Radius & Spacing"
              description="Border-radius scale derived from --radius: 0.5rem (tighter for precision). All values calculated proportionally."
            >
              <div className="space-y-8">
                <Demo label="Radius Scale">
                  <div className="flex w-full flex-wrap gap-6">
                    {[
                      { label: "radius-sm", cls: "rounded-sm" },
                      { label: "radius-md", cls: "rounded-md" },
                      { label: "radius-lg", cls: "rounded-lg" },
                      { label: "radius-xl", cls: "rounded-xl" },
                      { label: "radius-2xl", cls: "rounded-2xl" },
                      { label: "radius-3xl", cls: "rounded-3xl" },
                      { label: "radius-full", cls: "rounded-full" },
                    ].map(({ label, cls }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-2"
                      >
                        <div
                          className={`size-16 border-2 border-border bg-muted ${cls}`}
                        />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </Demo>

                <Demo label="Spacing Scale (Gap)">
                  <div className="flex flex-col gap-3 w-full">
                    {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
                      <div key={n} className="flex items-center gap-3">
                        <span className="w-16 font-mono text-xs text-muted-foreground">
                          {n * 4}px
                        </span>
                        <div
                          className="h-4 rounded-sm bg-primary/60"
                          style={{ width: `${n * 4 * 2}px` }}
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                          gap-{n}
                        </span>
                      </div>
                    ))}
                  </div>
                </Demo>
              </div>
            </Section>

            {/* ══ 3.5 Elevation & Motion ══ */}
            <Section
              id="elevation"
              title="Elevation & Motion"
              description="Three elevation levels, standardised easing, and duration tokens. All respect prefers-reduced-motion."
            >
              <div className="space-y-8">
                <Demo label="Elevation Levels">
                  <div className="grid w-full gap-4 sm:grid-cols-3">
                    <div className="elevation-1 rounded-xl bg-card p-5">
                      <p className="label-quiet">elevation-1</p>
                      <p className="mt-2 text-sm text-muted-foreground">Subtle lift. Cards, list items.</p>
                    </div>
                    <div className="elevation-2 rounded-xl bg-card p-5">
                      <p className="label-quiet">elevation-2</p>
                      <p className="mt-2 text-sm text-muted-foreground">Raised surface. Popovers, dropdowns.</p>
                    </div>
                    <div className="elevation-3 rounded-xl bg-card p-5">
                      <p className="label-quiet">elevation-3</p>
                      <p className="mt-2 text-sm text-muted-foreground">Prominent surface. Modals, dialogs.</p>
                    </div>
                  </div>
                </Demo>

                <Demo label="Duration Tokens">
                  <div className="w-full space-y-3">
                    {[
                      { name: "--duration-fast", value: "150ms", use: "Micro-interactions: hover, focus, toggle" },
                      { name: "--duration-base", value: "200ms", use: "Default transitions: colour, opacity" },
                      { name: "--duration-slow", value: "350ms", use: "Entrance/exit animations" },
                    ].map(({ name, value, use }) => (
                      <div key={name} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                        <code className="w-48 shrink-0 text-xs">{name}</code>
                        <span className="w-16 shrink-0 font-mono text-xs font-semibold text-brand">{value}</span>
                        <span className="text-xs text-muted-foreground">{use}</span>
                      </div>
                    ))}
                  </div>
                </Demo>

                <Demo label="Entrance Animation — .animate-fade-up">
                  <div className="w-full space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`animate-fade-up stagger-${i} flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm`}
                      >
                        <div className="size-2 rounded-full bg-brand" />
                        Item {i} — fades up with a {i * 50}ms delay
                      </div>
                    ))}
                  </div>
                </Demo>

                <Demo label="Brand Strip — .brand-strip">
                  <div className="w-full max-w-sm space-y-3">
                    <div className="brand-strip">
                      <p className="label-quiet">Section Label</p>
                      <p className="mt-1 font-medium">Use brand strips to anchor section headings</p>
                    </div>
                    <div className="brand-strip">
                      <p className="label-quiet">Key Metric</p>
                      <p className="mt-1 text-2xl font-semibold">4,217</p>
                    </div>
                  </div>
                </Demo>

                <Demo label="Quiet Label — .label-quiet">
                  <div className="space-y-2">
                    <p className="label-quiet">Section Type</p>
                    <p className="label-quiet">Last Updated • 2h ago</p>
                    <p className="label-quiet">Status • Active</p>
                  </div>
                </Demo>
              </div>
            </Section>

            {/* ══ 4. Buttons ══ */}
            <Section
              id="buttons"
              title="Button"
              description="All variants and sizes of the Button component."
            >
              <div className="space-y-8">
                <Demo label="Variants">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </Demo>

                <Demo label="Sizes">
                  <Button size="xs">XSmall</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Plus />
                  </Button>
                  <Button size="icon-xs">
                    <Plus />
                  </Button>
                  <Button size="icon-sm">
                    <Plus />
                  </Button>
                  <Button size="icon-lg">
                    <Plus />
                  </Button>
                </Demo>

                <Demo label="With Icons">
                  <Button>
                    <Download /> Download
                  </Button>
                  <Button variant="outline">
                    <Share2 /> Share
                  </Button>
                  <Button variant="secondary">
                    <Copy /> Copy
                  </Button>
                  <Button variant="ghost">
                    <Star /> Favourite
                  </Button>
                </Demo>

                <Demo label="States">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>
                    Outline Disabled
                  </Button>
                  <Button variant="ghost" disabled>
                    Ghost Disabled
                  </Button>
                </Demo>

                <Demo label="Button Group">
                  <ButtonGroup>
                    <Button variant="outline">
                      <Bold />
                    </Button>
                    <Button variant="outline">
                      <Italic />
                    </Button>
                    <Button variant="outline">
                      <Underline />
                    </Button>
                  </ButtonGroup>
                  <ButtonGroup>
                    <Button variant="outline">
                      <AlignLeft />
                    </Button>
                    <Button variant="outline">
                      <AlignCenter />
                    </Button>
                    <Button variant="outline">
                      <AlignRight />
                    </Button>
                  </ButtonGroup>
                </Demo>
              </div>
            </Section>

            {/* ══ 5. Badges ══ */}
            <Section
              id="badges"
              title="Badge"
              description="Label and status indicators."
            >
              <Demo label="Variants">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
                <Badge variant="link">Link</Badge>
              </Demo>
            </Section>

            {/* ══ 6. Alerts ══ */}
            <Section
              id="alerts"
              title="Alert"
              description="Contextual feedback and notification messages."
            >
              <div className="space-y-3 w-full">
                <Alert>
                  <Info />
                  <AlertTitle>Heads up!</AlertTitle>
                  <AlertDescription>
                    This is the default alert. Use it for informational
                    messages.
                  </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <XCircle />
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>
                    The destructive alert signals errors or irreversible
                    actions.
                  </AlertDescription>
                </Alert>
              </div>
            </Section>

            {/* ══ 7. Avatars ══ */}
            <Section
              id="avatars"
              title="Avatar"
              description="User profile images with fallback and group support."
            >
              <div className="space-y-8">
                <Demo label="Sizes">
                  <Avatar size="sm">
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <Avatar size="default">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="shadcn"
                    />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <Avatar size="lg">
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                </Demo>

                <Demo label="With Badge">
                  <Avatar size="default">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="shadcn"
                    />
                    <AvatarFallback>SC</AvatarFallback>
                    <AvatarBadge />
                  </Avatar>
                  <Avatar size="lg">
                    <AvatarFallback>LG</AvatarFallback>
                    <AvatarBadge />
                  </Avatar>
                </Demo>

                <Demo label="Group">
                  <AvatarGroup>
                    <Avatar>
                      <AvatarImage
                        src="https://github.com/shadcn.png"
                        alt="shadcn"
                      />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>AB</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>XY</AvatarFallback>
                    </Avatar>
                    <AvatarGroupCount>+4</AvatarGroupCount>
                  </AvatarGroup>
                </Demo>
              </div>
            </Section>

            {/* ══ 8. Cards ══ */}
            <Section
              id="cards"
              title="Card"
              description="Container cards with header, content, footer, and action areas."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Default Card</CardTitle>
                    <CardDescription>
                      A simple card with header and content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Cards are the fundamental surface for grouping related
                      information together.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>With Action</CardTitle>
                    <CardDescription>
                      CardAction sits in the header.
                    </CardDescription>
                    <CardAction>
                      <Button size="icon-sm" variant="ghost">
                        <MoreHorizontal />
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      The CardAction slot anchors to the top-right of the
                      header.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>With Footer</CardTitle>
                    <CardDescription>
                      Includes a muted footer area.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Footer is great for actions or metadata.
                    </p>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated 2h ago
                    </span>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </CardFooter>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Small Card</CardTitle>
                    <CardDescription>
                      size="sm" reduces internal padding.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Compact cards for dense UIs.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </Section>

            {/* ══ 9. Forms & Inputs ══ */}
            <Section
              id="forms"
              title="Forms & Inputs"
              description="Input, Textarea, Select, Checkbox, Radio, Switch, Slider, and OTP."
            >
              <div className="space-y-10">
                <Demo label="Text Input">
                  <div className="w-full max-w-sm space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="input-default">Label</Label>
                      <Input id="input-default" placeholder="Default input…" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="input-disabled">Disabled</Label>
                      <Input
                        id="input-disabled"
                        placeholder="Disabled"
                        disabled
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="input-invalid">Invalid</Label>
                      <Input
                        id="input-invalid"
                        placeholder="Invalid"
                        aria-invalid
                      />
                    </div>
                  </div>
                </Demo>

                <Demo label="Textarea">
                  <div className="w-full max-w-sm space-y-1.5">
                    <Label htmlFor="textarea-demo">Message</Label>
                    <Textarea
                      id="textarea-demo"
                      placeholder="Write something…"
                      rows={4}
                    />
                  </div>
                </Demo>

                <Demo label="Select">
                  <div className="w-full max-w-xs">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apple">Apple</SelectItem>
                        <SelectItem value="banana">Banana</SelectItem>
                        <SelectItem value="cherry">Cherry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Demo>

                <Demo label="Checkbox">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="cb1" defaultChecked />
                      <Label htmlFor="cb1">Accept terms and conditions</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="cb2" />
                      <Label htmlFor="cb2">Subscribe to newsletter</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="cb3" disabled />
                      <Label htmlFor="cb3" className="opacity-50">
                        Disabled option
                      </Label>
                    </div>
                  </div>
                </Demo>

                <Demo label="Radio Group">
                  <RadioGroup defaultValue="option-a">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="option-a" id="r1" />
                      <Label htmlFor="r1">Option A</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="option-b" id="r2" />
                      <Label htmlFor="r2">Option B</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="option-c" id="r3" />
                      <Label htmlFor="r3">Option C</Label>
                    </div>
                  </RadioGroup>
                </Demo>

                <Demo label="Switch">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch id="sw1" defaultChecked size="sm" />
                      <Label htmlFor="sw1">Small (checked)</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch id="sw2" defaultChecked />
                      <Label htmlFor="sw2">Default (checked)</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch id="sw3" disabled />
                      <Label htmlFor="sw3" className="opacity-50">
                        Disabled
                      </Label>
                    </div>
                  </div>
                </Demo>

                <Demo label="Slider">
                  <div className="w-full max-w-xs space-y-4">
                    <Slider defaultValue={[40]} />
                    <Slider defaultValue={[20, 70]} />
                    <Slider defaultValue={[60]} disabled />
                  </div>
                </Demo>

                <Demo label="OTP Input">
                  <InputOTP maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </Demo>

                <Demo label="Calendar">
                  <Calendar
                    mode="single"
                    selected={calendarDate}
                    onSelect={setCalendarDate}
                    className="rounded-xl border border-border w-fit"
                  />
                </Demo>
              </div>
            </Section>

            {/* ══ 10. Feedback ══ */}
            <Section
              id="feedback"
              title="Feedback & Status"
              description="Progress, Skeleton, Spinner, and Empty state components."
            >
              <div className="space-y-8">
                <Demo label="Progress">
                  <div className="w-full max-w-sm space-y-3">
                    <Progress value={25} />
                    <Progress value={50} />
                    <Progress value={75} />
                    <Progress value={100} />
                  </div>
                </Demo>

                <Demo label="Skeleton">
                  <div className="w-full max-w-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </div>
                </Demo>

                <Demo label="Spinner">
                  <div className="flex items-center gap-4">
                    <Spinner className="size-3" />
                    <Spinner className="size-4" />
                    <Spinner className="size-6" />
                  </div>
                </Demo>

                <Demo label="Empty State">
                  <div className="w-full max-w-sm">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Search />
                        </EmptyMedia>
                        <EmptyTitle>No results found</EmptyTitle>
                        <EmptyDescription>
                          Try adjusting your search or filters to find what
                          you&apos;re looking for.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button size="sm" variant="outline">
                          <Plus /> Add item
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </div>
                </Demo>
              </div>
            </Section>

            {/* ══ 11. Overlays ══ */}
            <Section
              id="overlays"
              title="Overlays & Popovers"
              description="Dialog, Drawer, Sheet, Popover, HoverCard, Tooltip, DropdownMenu."
            >
              <div className="space-y-8">
                <Demo label="Dialog">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                        <DialogDescription>
                          This is the dialog description. It provides context
                          about the dialog's purpose.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-2 text-sm text-muted-foreground">
                        Dialog body content goes here. You can place forms,
                        lists, or any other content.
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </Demo>

                <Demo label="Drawer">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button variant="outline">Open Drawer</Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Drawer Title</DrawerTitle>
                        <DrawerDescription>
                          Pull from the bottom of the screen.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="px-4 py-2 text-sm text-muted-foreground">
                        Drawer content area.
                      </div>
                      <DrawerFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Submit</Button>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </Demo>

                <Demo label="Sheet">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">Open Sheet</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Sheet Panel</SheetTitle>
                        <SheetDescription>
                          Slides in from the right. Ideal for settings, filters,
                          or detail views.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="py-6 text-sm text-muted-foreground">
                        Sheet body content.
                      </div>
                      <SheetFooter>
                        <Button>Save</Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </Demo>

                <Demo label="Dropdown Menu">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Open Menu <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem>
                          <User className="mr-2 size-4" />
                          Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 size-4" />
                          Settings
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <LogOut className="mr-2 size-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Demo>

                <Demo label="Popover">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Open Popover</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-2">
                        <h4 className="font-medium">Popover Content</h4>
                        <p className="text-sm text-muted-foreground">
                          Popovers are non-modal overlays anchored to a trigger
                          element.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Demo>

                <Demo label="Hover Card">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="link">@shadcn</Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>SC</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">@shadcn</h4>
                          <p className="text-sm text-muted-foreground">
                            Creator of shadcn/ui — the component library
                            powering this design system.
                          </p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </Demo>

                <Demo label="Tooltip">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline">
                        <Info />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      This is a tooltip — appears on hover
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost">
                        <Star /> Favourite
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add to favourites</TooltipContent>
                  </Tooltip>
                </Demo>
              </div>
            </Section>

            {/* ══ 12. Navigation ══ */}
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
                      <p className="text-sm text-muted-foreground">
                        Second tab.
                      </p>
                    </TabsContent>
                    <TabsContent value="tab3" className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Third tab.
                      </p>
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
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full max-w-md"
                  >
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What is Tresta?</AccordionTrigger>
                      <AccordionContent>
                        Tresta is a platform for managing testimonials, reviews,
                        and social proof. Built with a quiet, precise design
                        system.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        Which components are included?
                      </AccordionTrigger>
                      <AccordionContent>
                        55 shadcn/ui components are installed across the design
                        system — from basic inputs to complex data tables and
                        charts.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>What style is used?</AccordionTrigger>
                      <AccordionContent>
                        The radix-nova style is applied, using Tailwind v4 and
                        CSS custom properties (oklch) as design tokens.
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
                      This collapsible section can hide or reveal content on
                      demand.
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

            {/* ══ 13. Data Display ══ */}
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
                        {[
                          {
                            name: "Alice Martin",
                            status: "Active",
                            role: "Admin",
                            rating: 4.9,
                          },
                          {
                            name: "Bob Chen",
                            status: "Invited",
                            role: "Editor",
                            rating: 4.2,
                          },
                          {
                            name: "Carol Davis",
                            status: "Active",
                            role: "Viewer",
                            rating: 4.7,
                          },
                        ].map((row) => (
                          <TableRow key={row.name}>
                            <TableCell className="font-medium">
                              {row.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  row.status === "Active"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.role}
                            </TableCell>
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
                      <p className="text-sm text-muted-foreground">
                        Before separator
                      </p>
                      <Separator className="my-3" />
                      <p className="text-sm text-muted-foreground">
                        After separator
                      </p>
                    </div>
                    <div className="flex h-8 items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Left
                      </span>
                      <Separator orientation="vertical" />
                      <span className="text-sm text-muted-foreground">
                        Right
                      </span>
                    </div>
                  </div>
                </Demo>
              </div>
            </Section>

            {/* ══ 14. Misc ══ */}
            <Section
              id="misc"
              title="Miscellaneous"
              description="Toggle, ToggleGroup, Kbd, and other utility components."
            >
              <div className="space-y-8">
                <Demo label="Toggle">
                  <Toggle aria-label="Bold">
                    <Bold />
                    Bold
                  </Toggle>
                  <Toggle variant="outline" aria-label="Italic">
                    <Italic />
                    Italic
                  </Toggle>
                  <Toggle size="sm" aria-label="Underline">
                    <Underline />
                  </Toggle>
                  <Toggle size="lg" aria-label="Star">
                    <Star />
                  </Toggle>
                </Demo>

                <Demo label="Toggle Group">
                  <ToggleGroup type="single" defaultValue="center">
                    <ToggleGroupItem value="left" aria-label="Left">
                      <AlignLeft />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center" aria-label="Center">
                      <AlignCenter />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right" aria-label="Right">
                      <AlignRight />
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <ToggleGroup type="multiple">
                    <ToggleGroupItem value="bold" aria-label="Bold">
                      <Bold />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Italic">
                      <Italic />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Underline">
                      <Underline />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Demo>

                <Demo label="Keyboard Shortcut (Kbd)">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Search <Kbd>⌘</Kbd>
                      <Kbd>K</Kbd>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Save <Kbd>Ctrl</Kbd>
                      <Kbd>S</Kbd>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Theme <Kbd>⇧</Kbd>
                      <Kbd>D</Kbd>
                    </div>
                  </div>
                </Demo>
              </div>
            </Section>

            {/* Footer spacer */}
            <div className="h-16" />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
