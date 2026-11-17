import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin/staff";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage() {
  const staff = await getStaff();
  if (staff?.aal2) redirect("/admin");
  if (staff) redirect("/admin/2fa");
  return <LoginForm />;
}
