"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  UserCircle as UserCircleIcon,
  CreditCard as CreditCardIcon,
  SignOut as LogOutIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userDisplayName, userInitials } from "@/lib/format";

// ── User menu (avatar dropdown) ────────────────────────────────────────────────

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const firstName = user?.firstName ?? null;
  const lastName = user?.lastName ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatar = user?.imageUrl ?? undefined;
  const name = userDisplayName(firstName, lastName, email);
  const initials = userInitials(firstName, lastName, email);

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
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="size-8">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-brand/15 text-[11px] font-semibold text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="gap-2 text-xs">
            <UserCircleIcon className="size-3.5 text-muted-foreground" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing" className="gap-2 text-xs">
            <CreditCardIcon className="size-3.5 text-muted-foreground" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-xs text-destructive focus:text-destructive"
          onSelect={() => signOut(() => router.push("/sign-in"))}
        >
          <LogOutIcon className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
