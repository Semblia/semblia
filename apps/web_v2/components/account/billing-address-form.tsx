"use client";

/**
 * The "Billing address" settings section.
 *
 * The form skeletonised itself with a hand-written `isWaitingForLiveData ?`
 * ladder and had no failure surface at all: when the profile request failed it
 * rendered an empty, editable address form whose save would fail too. It now
 * runs through `DataState`, and the save band states in place why it is
 * unavailable rather than silently disappearing.
 */

import * as React from "react";
import { toast } from "sonner";
import type { V2BillingProfileDTO } from "@workspace/types";
import { DataState, SettingsSection, useDataState } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useBillingProfile, useUpdateBillingProfile } from "@/hooks/api";

type BillingProfileForm = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin: string;
};

const EMPTY_FORM: BillingProfileForm = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  gstin: "",
};

// ── Country list (abbreviated) ─────────────────────────────────────────────────

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
];

// ── Billing address form ───────────────────────────────────────────────────────

export function BillingAddressForm() {
  const profileQuery = useBillingProfile({ freshOnMount: true });
  const dataState = useDataState(profileQuery, { requireFreshOnMount: true });
  const profile = profileQuery.data;

  const [form, setForm] = React.useState<BillingProfileForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] =
    React.useState<BillingProfileForm>(EMPTY_FORM);
  const initialFormRef = React.useRef(initialForm);
  const dirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  React.useEffect(() => {
    initialFormRef.current = initialForm;
  }, [initialForm]);

  React.useEffect(() => {
    if (profile) {
      const seeded: BillingProfileForm = {
        name: profile.name ?? "",
        line1: profile.line1 ?? "",
        line2: profile.line2 ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        postalCode: profile.postalCode ?? "",
        country: profile.country ?? "IN",
        gstin: profile.gstin ?? "",
      };
      // A refresh must not overwrite edits in progress — only adopt the server
      // copy when the user hasn't touched the form since it was last seeded.
      setForm((current) =>
        JSON.stringify(current) !== JSON.stringify(initialFormRef.current)
          ? current
          : seeded,
      );
      setInitialForm(seeded);
    }
  }, [profile]);

  const updateMutation = useUpdateBillingProfile();
  const saving = updateMutation.isPending;
  const save = () => {
    const payload: Partial<V2BillingProfileDTO> = {
      name: form.name,
      line1: form.line1,
      line2: form.line2,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: form.country,
      // GSTIN only exists for India; sending a stale one after a country change
      // would persist a number that no longer applies.
      gstin: form.country === "IN" ? form.gstin : "",
    };
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setInitialForm(form);
        toast.success("Billing address saved.");
      },
      onError: () => toast.error("Failed to save billing address."),
    });
  };

  function discard() {
    setForm(initialForm);
  }

  function field(key: keyof BillingProfileForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <SettingsSection
      id="billing-address"
      title="Billing address"
      description="Printed on every invoice. The GSTIN field appears when the country is India."
      staggerIndex={4}
      flush
    >
      <DataState
        state={dataState}
        resource="your billing address"
        align="start"
        compactError
        skeleton={<BillingAddressSkeleton />}
      >
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full-width fields */}
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="billing-name">Name or organisation</Label>
              <Input
                id="billing-name"
                placeholder="Acme Corp"
                autoComplete="organization"
                {...field("name")}
              />
            </div>

            <div className="col-span-full space-y-1.5">
              <Label htmlFor="billing-line1">Address line 1</Label>
              <Input
                id="billing-line1"
                placeholder="123 Main St"
                autoComplete="address-line1"
                {...field("line1")}
              />
            </div>

            <div className="col-span-full space-y-1.5">
              <Label htmlFor="billing-line2">
                Address line 2{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="billing-line2"
                placeholder="Suite 100"
                autoComplete="address-line2"
                {...field("line2")}
              />
            </div>

            {/* 2-col fields */}
            <div className="space-y-1.5">
              <Label htmlFor="billing-city">City</Label>
              <Input
                id="billing-city"
                placeholder="Mumbai"
                autoComplete="address-level2"
                {...field("city")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-state">State / Province</Label>
              <Input
                id="billing-state"
                placeholder="Maharashtra"
                autoComplete="address-level1"
                {...field("state")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-postal">Postal code</Label>
              <Input
                id="billing-postal"
                placeholder="400001"
                autoComplete="postal-code"
                {...field("postalCode")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-country">Country</Label>
              <Select
                value={form.country}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, country: v }))
                }
              >
                <SelectTrigger id="billing-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* GSTIN (India only) */}
            {form.country === "IN" && (
              <div className="col-span-full space-y-1.5">
                <Label htmlFor="billing-gstin">
                  GSTIN{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="billing-gstin"
                  placeholder="22AAAAA0000A1Z5"
                  {...field("gstin")}
                />
              </div>
            )}
          </div>

          {/* The save band stays mounted so the control never appears and
              disappears under the cursor; when there is nothing to save it says
              so instead of leaving a bare disabled button. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p
              id="billing-address-save-reason"
              className="min-w-0 text-xs text-muted-foreground"
            >
              {dirty ? "" : "No unsaved changes."}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={discard}
                disabled={!dirty || saving}
                className="text-muted-foreground"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={!dirty || saving}
                aria-describedby={
                  dirty ? undefined : "billing-address-save-reason"
                }
                className="min-w-[7rem] tactile"
              >
                {saving ? "Saving…" : "Save address"}
              </Button>
            </div>
          </div>
        </div>
      </DataState>
    </SettingsSection>
  );
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Matches the real grid: three full-width rows then four half-width ones.
function BillingAddressSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-4 px-4 py-5 sm:px-6 sm:grid-cols-2"
    >
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={i < 3 ? "col-span-full space-y-1.5" : "space-y-1.5"}
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
