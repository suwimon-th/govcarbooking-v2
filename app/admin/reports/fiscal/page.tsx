import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccessProfile } from "@/lib/access-server";
import { hasAccess } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/session";
import FiscalReportClient from "./FiscalReportClient";

export default async function FiscalReportPage() {
  const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
  if (!profile) redirect("/calendar?login=1");
  if (!hasAccess(profile, "reports.fiscal")) redirect("/access-denied");
  return <FiscalReportClient />;
}
