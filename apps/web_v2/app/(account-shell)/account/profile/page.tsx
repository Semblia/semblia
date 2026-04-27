"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { PageHeader, PageBody, SettingsSection, SettingsFooter } from "@/components/shared";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Profile page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Seed form once user loads
  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    isLoaded &&
    (firstName !== (user?.firstName ?? "") || lastName !== (user?.lastName ?? ""));

  function discard() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      toast.success("Profile updated.");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?";

  return (
    <>
      <PageHeader title="Profile" description="Manage your personal information." />

      <PageBody padding="default" className="space-y-8 pb-24">
        {/* Avatar section */}
        <SettingsSection id="avatar" title="Photo" staggerIndex={0}>
          <Card>
            <CardContent className="flex items-center gap-5 pt-0">
              {!isLoaded ? (
                <Skeleton className="size-16 rounded-full" />
              ) : (
                <AvatarUpload
                  imageUrl={user?.imageUrl}
                  initials={initials}
                />
              )}
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {isLoaded ? (user?.fullName || "—") : <Skeleton className="h-4 w-32" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isLoaded
                    ? user?.primaryEmailAddress?.emailAddress ?? ""
                    : <Skeleton className="h-3 w-48" />}
                </p>
              </div>
            </CardContent>
          </Card>
        </SettingsSection>

        {/* Name section */}
        <SettingsSection
          id="name"
          title="Personal info"
          description="Your name is shown on your profile and in notifications sent to collaborators."
          staggerIndex={1}
        >
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first-name">First name</Label>
                {!isLoaded ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name">Last name</Label>
                {!isLoaded ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </SettingsSection>
      </PageBody>

      <SettingsFooter
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={discard}
      />
    </>
  );
}
