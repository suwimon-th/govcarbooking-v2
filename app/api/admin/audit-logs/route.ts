import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accessDatabase, getAccessProfile } from "@/lib/access-server";
import { SESSION_COOKIE } from "@/lib/session";

async function administrator() {
  return getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function GET() {
  try {
    const actor = await administrator();
    if (!actor) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (actor.role !== "ADMIN" && !actor.permissions.includes("audit_logs")) return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });

    const db = accessDatabase();
    const { data, error } = await db
      .from("system_audit_logs")
      .select(`
        *,
        actor:profiles!actor_id(full_name, role),
        target:profiles!target_id(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Audit logs error:", error);
      return NextResponse.json({ error: "ไม่สามารถดึงประวัติได้" }, { status: 500 });
    }

    return NextResponse.json({ logs: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("Catch error:", err);
    return NextResponse.json({ error: "โหลดประวัติไม่ได้" }, { status: 503 });
  }
}
