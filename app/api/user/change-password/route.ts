import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { old_password, new_password } = await req.json();

    // ตรวจสอบรหัสผ่านเดิม
    const { data: user, error: e1 } = await supabase
      .from("profiles")
      .select("password")
      .eq("id", userId)
      .single();

    if (e1) throw e1;

    if (user.password !== old_password)
      return NextResponse.json(
        { error: "รหัสผ่านเดิมไม่ถูกต้อง" },
        { status: 400 }
      );

    // อัปเดตรหัสผ่านใหม่
    const { error } = await supabase
      .from("profiles")
      .update({ password: new_password })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "เปลี่ยนรหัสผ่านไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
