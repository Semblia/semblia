"use client";

import * as React from "react";
import { Section, Demo } from "./design-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import { MagnifyingGlass as Search, Plus } from "@phosphor-icons/react";

export function FormsSection() {
  const [calendarDate, setCalendarDate] = React.useState<Date | undefined>(new Date());

  return (
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
              <Input id="input-disabled" placeholder="Disabled" disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-invalid">Invalid</Label>
              <Input id="input-invalid" placeholder="Invalid" aria-invalid />
            </div>
          </div>
        </Demo>

        <Demo label="Textarea">
          <div className="w-full max-w-sm space-y-1.5">
            <Label htmlFor="textarea-demo">Message</Label>
            <Textarea id="textarea-demo" placeholder="Write something…" rows={4} />
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
              <Label htmlFor="cb3" className="opacity-50">Disabled option</Label>
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
              <Label htmlFor="sw3" className="opacity-50">Disabled</Label>
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
  );
}

export function FeedbackSection() {
  return (
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
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>No results found</EmptyTitle>
                <EmptyDescription>
                  Try adjusting your search or filters to find what you&apos;re looking for.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" variant="outline"><Plus /> Add item</Button>
              </EmptyContent>
            </Empty>
          </div>
        </Demo>
      </div>
    </Section>
  );
}
