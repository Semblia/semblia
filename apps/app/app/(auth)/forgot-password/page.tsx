import type { Metadata } from "next";
import { ForgotPasswordForm } from "./_form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
