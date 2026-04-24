"use client";

import { Section, Demo } from "./design-helpers";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  GearSix as Settings,
  User,
  SignOut as LogOut,
  DotsThree as MoreHorizontal,
  Info,
  Star,
} from "@phosphor-icons/react";

export function OverlaysSection() {
  return (
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
                  This is the dialog description. It provides context about the dialog&apos;s purpose.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-sm text-muted-foreground">
                Dialog body content goes here. You can place forms, lists, or any other content.
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
                <DrawerDescription>Pull from the bottom of the screen.</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 py-2 text-sm text-muted-foreground">Drawer content area.</div>
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
                  Slides in from the right. Ideal for settings, filters, or detail views.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 text-sm text-muted-foreground">Sheet body content.</div>
              <SheetFooter>
                <Button>Save</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Demo>

        <Demo label="Dropdown Menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open Menu <MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <User className="mr-2 size-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" /> Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 size-4" /> Log out
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
                  Popovers are non-modal overlays anchored to a trigger element.
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
                    Creator of shadcn/ui — the component library powering this design system.
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </Demo>

        <Demo label="Tooltip">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline"><Info /></Button>
            </TooltipTrigger>
            <TooltipContent>This is a tooltip — appears on hover</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost"><Star /> Favourite</Button>
            </TooltipTrigger>
            <TooltipContent>Add to favourites</TooltipContent>
          </Tooltip>
        </Demo>
      </div>
    </Section>
  );
}
