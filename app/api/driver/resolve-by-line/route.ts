// app/api/driver/resolve-by-line/route.ts
// ค้นหา driver_id จาก line_user_id
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  // สร้าง client ใน handler เพื่อป้องกัน module-level error ตอน build
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const line_user_id = req.nextUrl.searchParams.get("line_uid");

    if (!line_user_id) {
      return NextResponse.json(
        { error: "Missing line_uid parameter" },
        { status: 400 }
      );
    }

    const { data: driver, error } = await supabase
      .from("drivers")
      .select("id, full_name, line_picture_url")
      .eq("line_user_id", line_user_id)
      .single();

    if (error || !driver) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลพนักงานขับรถที่เชื่อมต่อกับ LINE นี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      driver_id: driver.id,
      full_name: driver.full_name,
      line_picture_url: driver.line_picture_url,
    });
  } catch (e: any) {
    console.error("resolve-by-line error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
