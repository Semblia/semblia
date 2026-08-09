import type { Metadata } from "next";
import { SignInForm } from "./_form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignInForm />;
}
