"use client";

import { useTheme } from "next-themes";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "light", label: "Light", Icon: SunIcon },
  { key: "dark", label: "Dark", Icon: MoonIcon },
  { key: "system", label: "System", Icon: MonitorIcon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground",
            className
          )}
          aria-label="Toggle colour theme"
        >
          <SunIcon className="size-3.5 scale-100 transition-transform dark:scale-0" />
          <MoonIcon className="absolute size-3.5 scale-0 transition-transform dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-36"
      >
        {THEMES.map(({ key, label, Icon }) => (
          <DropdownMenuItem
            key={key}
            onSelect={() => setTheme(key)}
            className="gap-2"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            {label}
            {theme === key && (
              <span
                className="ml-auto size-1.5 shrink-0 rounded-full bg-brand"
                aria-hidden
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
