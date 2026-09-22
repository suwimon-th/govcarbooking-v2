import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccessProfile } from "@/lib/access-server";
import { hasAccess } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/session";
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
  if (!profile) redirect("/calendar?login=1");
  const { tab } = await searchParams;
  if (tab === "FUEL" && hasAccess(profile, "reports.fuel")) redirect("/admin/reports/fuel");
  if (tab === "ANNUAL" && hasAccess(profile, "reports.annual")) redirect("/admin/reports/annual");
  if (hasAccess(profile, "reports")) redirect("/admin/reports/monthly");
  if (hasAccess(profile, "reports.fuel")) redirect("/admin/reports/fuel");
  if (hasAccess(profile, "reports.annual")) redirect("/admin/reports/annual");
  redirect("/access-denied");
}
