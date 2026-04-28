"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { SettingsFooter } from "@/components/shared";
import {
  apiGetBillingProfile,
  apiUpdateBillingProfile,
  type BillingProfile,
} from "@/lib/api";

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
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["billing-profile"],
    queryFn: apiGetBillingProfile,
  });

  const [form, setForm] = React.useState<BillingProfile>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "IN",
    gstin: "",
  });

  const [initialForm, setInitialForm] = React.useState<BillingProfile>(form);

  React.useEffect(() => {
    if (profile) {
      const seeded: BillingProfile = {
        name: profile.name ?? "",
        line1: profile.line1 ?? "",
        line2: profile.line2 ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        postalCode: profile.postalCode ?? "",
        country: profile.country ?? "IN",
        gstin: profile.gstin ?? "",
      };
      setForm(seeded);
      setInitialForm(seeded);
    }
  }, [profile]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => apiUpdateBillingProfile(form),
    onSuccess: (updated) => {
      qc.setQueryData(["billing-profile"], updated);
      setInitialForm(form);
      toast.success("Billing address saved.");
    },
    onError: () => toast.error("Failed to save billing address."),
  });

  function discard() {
    setForm(initialForm);
  }

  function field(key: keyof BillingProfile) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <>
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
                GSTIN <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="billing-gstin"
                placeholder="22AAAAA0000A1Z5"
                {...field("gstin")}
              />
            </div>
          )}
      </div>

      <SettingsFooter
        dirty={dirty}
        saving={saving}
        onSave={() => save()}
        onDiscard={discard}
      />
    </>
  );
}
