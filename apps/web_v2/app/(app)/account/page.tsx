import { redirect } from "next/navigation";
import { accountProfilePath } from "@/lib/routes";

export default function AccountIndexPage() {
  redirect(accountProfilePath());
}
