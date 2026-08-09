import { PageHeader } from "@/components/shared";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsClient />
    </>
  );
}
