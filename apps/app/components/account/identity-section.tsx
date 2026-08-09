"use client";

/**
 * The "Identity" settings section: profile photo and name.
 *
 * Each field used to skeletonise itself off Clerk's `isLoaded` — the
 * hand-written ladder the system forbids, with the usual hole underneath it: a
 * session that resolved without a user rendered an empty, editable form whose
 * save could never land. The whole section now runs through `DataState`, so a
 * failed session reads as a failure, and the skeleton matches the real layout
 * (one avatar, two labelled fields) so the swap causes no shift.
 */

import * as React from "react";
import {
  DataState,
  SettingsSection,
  type DataStateResult,
} from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUpload } from "@/components/account/avatar-upload";

export interface IdentitySectionProps {
  state: DataStateResult;
  imageUrl?: string | null;
  initials: string;
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

export function IdentitySection({
  state,
  imageUrl,
  initials,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: IdentitySectionProps) {
  return (
    <SettingsSection
      id="identity"
      title="Identity"
      description="Your name and photo, shown on your profile and on the notifications Semblia sends you."
      staggerIndex={0}
    >
      <DataState
        state={state}
        resource="your profile"
        align="start"
        compactError
        skeleton={<IdentitySkeleton />}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <AvatarUpload
            imageUrl={imageUrl}
            initials={initials}
            className="shrink-0"
          />

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <NameField
              id="first-name"
              label="First name"
              value={firstName}
              onChange={onFirstNameChange}
              autoComplete="given-name"
            />
            <NameField
              id="last-name"
              label="Last name"
              value={lastName}
              onChange={onLastNameChange}
              autoComplete="family-name"
            />
          </div>
        </div>
      </DataState>
    </SettingsSection>
  );
}

// ── Name field ─────────────────────────────────────────────────────────────────

interface NameFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}

// One labelled name input. The label doubles as the placeholder, as it did
// before these fields were shared.
function NameField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: NameFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        autoComplete={autoComplete}
      />
    </div>
  );
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Mirrors the real section's geometry — 64px avatar, two label + control pairs
// — so nothing moves when the data arrives. Contains no focusable element.
function IdentitySkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8"
    >
      <Skeleton className="size-16 shrink-0 rounded-full" />
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
