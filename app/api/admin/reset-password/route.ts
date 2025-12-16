/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // ✅ แก้ตรงนี้
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, new_password } = await req.json();

    if (!id || !new_password) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ" },
        { status: 400 }
      );
    }

    // อัปเดตรหัสผ่านใน profiles
    const { error } = await supabase
      .from("profiles")
      .update({ password: new_password })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "เปลี่ยนรหัสผ่านล้มเหลว: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
