import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const userId = (await cookieStore).get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { new_password } = await req.json();

    if (!new_password) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสผ่านใหม่" },
        { status: 400 }
      );
    }

    // ✅ อัปเดตรหัสผ่านใหม่ทันที (ไม่ตรวจของเดิม)
    const { error } = await supabase
      .from("profiles")
      .update({ password: new_password })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "เปลี่ยนรหัสผ่านไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
