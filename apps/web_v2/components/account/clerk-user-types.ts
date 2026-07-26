// Clerk resource shapes shared by the account surfaces. Derived from the
// `useUser()` return type so they track whatever the installed SDK exposes
// instead of being hand-copied per file.
import type { useUser } from "@clerk/nextjs";

export type MaybeUserResource = ReturnType<typeof useUser>["user"];

export type EmailAddressResource =
  NonNullable<MaybeUserResource>["emailAddresses"][number];

export type ExternalAccountResource =
  NonNullable<MaybeUserResource>["externalAccounts"][number];
