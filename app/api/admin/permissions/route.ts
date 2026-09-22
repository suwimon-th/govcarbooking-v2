import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accessDatabase, getAccessProfile } from "@/lib/access-server";
import { defaultPermissions, isPermissionKey, VALID_ROLES, PERMISSION_SECTIONS, PERMISSION_VERSION, storedPermissions } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/session";

async function administrator() {
  return getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
}
const unavailable = () => NextResponse.json({ error: "โหลดสิทธิ์ไม่ได้ กรุณาตรวจการเชื่อมต่อและติดตั้งตารางสิทธิ์ก่อนใช้งาน" }, { status: 503 });
export async function GET() {
  try {
    const actor = await administrator();
    if (!actor) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (actor.role !== "ADMIN") return NextResponse.json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
    const db = accessDatabase();
    const [profiles, grants] = await Promise.all([
      db.from("profiles").select("id, full_name, username, role").in("role", VALID_ROLES).neq("id", "00000000-0000-0000-0000-000000000000").order("full_name"),
      db.from("user_access_permissions").select("user_id, permissions, updated_at, permission_version"),
    ]);
    const storageReady = !grants.error;
    const localSetup = process.env.NODE_ENV === "development" && grants.error?.code === "PGRST205";
    if (profiles.error || (grants.error && !localSetup)) return unavailable();
    const users = (profiles.data || []).map(user => {
      const grant = grants.data?.find(g => g.user_id === user.id);
      return { ...user, permissions: user.role === "ADMIN" ? defaultPermissions("ADMIN") : grant ? storedPermissions(grant.permissions, grant.permission_version) : defaultPermissions(user.role), custom: !!grant, updated_at: grant?.updated_at ?? null };
    });
    return NextResponse.json({ users, storage_ready: storageReady }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return unavailable(); }
}
export async function PUT(request: Request) {
  try {
    const actor = await administrator();
    if (!actor) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (actor.role !== "ADMIN") return NextResponse.json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
    if (!body || typeof body.user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.user_id) || !Array.isArray(body.permissions) || body.permission_version !== PERMISSION_VERSION || body.permissions.length > PERMISSION_SECTIONS.length || !body.permissions.every(isPermissionKey)) {
      return NextResponse.json({ error: "รายการสิทธิ์ไม่ถูกต้อง" }, { status: 400 });
    }
    const db = accessDatabase();
    const { data: target, error } = await db.from("profiles").select("id, role").eq("id", body.user_id).maybeSingle();
    if (error) return unavailable();
    if (!target || !VALID_ROLES.includes(target.role) || target.id === "00000000-0000-0000-0000-000000000000") return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    if (target.role === "ADMIN") return NextResponse.json({ error: "ผู้ดูแลระบบเข้าถึงได้ทุกส่วน ไม่สามารถจำกัดสิทธิ์ที่หน้านี้" }, { status: 400 });
    const permissions = [...new Set<string>(body.permissions)];
    const { error: saveError } = await db.from("user_access_permissions").upsert({ user_id: target.id, permissions, permission_version: PERMISSION_VERSION, updated_by: actor.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (saveError) return unavailable();
    return NextResponse.json({ success: true, permissions });
  } catch { return unavailable(); }
}
