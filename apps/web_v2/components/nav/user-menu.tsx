"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { FoldersIcon, SignOut as LogOutIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userDisplayName, userInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ACCOUNT_NAV } from "./account-nav";

// ── User menu (avatar dropdown) ────────────────────────────────────────────────

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const pathname = usePathname();
  const firstName = user?.firstName ?? null;
  const lastName = user?.lastName ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatar = user?.imageUrl ?? undefined;
  const name = userDisplayName(firstName, lastName, email);
  const initials = userInitials(firstName, lastName, email);
  // userDisplayName falls back to the email when no real name is set; avoid
  // showing the same string on both lines of the menu header.
  const hasName = name.length > 0 && name !== email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-label={`Account menu — ${name}`}
        >
          <Avatar className="size-7">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-brand/15 text-[10px] font-semibold text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="size-8">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-brand/15 text-[11px] font-semibold text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {hasName ? name : email}
            </p>
            {hasName && (
              <p className="truncate text-[11px] text-muted-foreground">
                {email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
          Account
        </DropdownMenuLabel>
        {ACCOUNT_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className="gap-2.5 text-xs"
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-brand"
                  />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" className="gap-2.5 text-xs">
            <FoldersIcon className="size-4 shrink-0 text-muted-foreground" />
            All projects
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2.5 text-xs text-destructive focus:text-destructive"
          onSelect={() => signOut(() => router.push("/sign-in"))}
        >
          <LogOutIcon className="size-4 text-destructive" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
