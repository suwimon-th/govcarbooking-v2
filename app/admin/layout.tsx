import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/app/components/AdminShell";
import UserLayout from "@/app/user/layout";
import { getAccessProfile } from "@/lib/access-server";
import { SESSION_COOKIE } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
  if (!profile) redirect("/calendar?login=1");

  // Keep the user's navigation consistent when entering delegated management pages.
  // Page and API authorization continues to be enforced by proxy.ts.
  return profile.role === "ADMIN"
    ? <AdminShell>{children}</AdminShell>
    : <UserLayout>{children}</UserLayout>;
}
