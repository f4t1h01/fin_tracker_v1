import { redirect } from "next/navigation";

export default function DashboardRoutePage() {
  redirect("/profile/me/dashboard");
}
