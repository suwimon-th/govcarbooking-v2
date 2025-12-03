// app/api/driver/link-line/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { driver_id, line_user_id } = await req.json();

    if (!driver_id || !line_user_id) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ (driver_id, line_user_id)" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("drivers")
      .update({
        line_user_id,
        active: true,          // เชื่อมแล้วถือว่า Active
        status: "AVAILABLE",   // ตั้งค่าเริ่มต้นเป็นพร้อมใช้งาน
      })
      .eq("id", driver_id);

    if (error) {
      return NextResponse.json(
        { error: "บันทึกไม่สำเร็จ: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
